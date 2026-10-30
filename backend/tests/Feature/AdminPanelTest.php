<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Participation;
use App\Models\Report;
use App\Models\User;
use App\Notifications\RoleChanged;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\MakesInitiatives;
use Tests\TestCase;

class AdminPanelTest extends TestCase
{
    use MakesInitiatives;
    use RefreshDatabase;

    private function admin(array $attrs = []): User
    {
        return User::factory()->create(array_merge(['role' => 'admin'], $attrs));
    }

    public function test_stats_are_for_admins_only(): void
    {
        $this->getJson('/admin/stats')->assertUnauthorized();
        $this->spa()->actingAs(User::factory()->create())->getJson('/admin/stats')->assertForbidden();
        $this->spa()->actingAs($this->admin())->getJson('/admin/stats')->assertOk();
    }

    public function test_stats_count_accounts_initiatives_participations_and_reports(): void
    {
        $admin = $this->admin();
        $u1 = User::factory()->create();
        $u2 = User::factory()->create();
        User::factory()->unverified()->create();
        User::factory()->unverified()->create(['password' => null]); // brza prijava, bez lozinke

        $green = Category::create(['slug' => 'zelenilo', 'name' => 'Zelenilo']);
        $a = $this->makeInitiative();
        $this->makeInitiative();
        $this->makeInitiative(['starts_at' => now()->subDays(4), 'ends_at' => now()->subDays(4)->addHours(2)]);
        $this->makeInitiative(['kind' => 'permanent', 'starts_at' => null, 'ends_at' => null]);
        $this->makeInitiative(['cancelled_at' => now()]);
        $this->makeInitiative(['hidden_at' => now(), 'category_id' => $green->id]);

        $this->confirmedParticipation($a, $u1);
        $this->confirmedParticipation($a, $u2);
        $this->pendingParticipation($a);
        $cancelled = $this->confirmedParticipation($a);
        $cancelled->forceFill(['status' => 'cancelled'])->save();

        Report::create(['initiative_id' => $a->id, 'reason' => 'spam']);
        Report::create(['initiative_id' => $a->id, 'reason' => 'lazno']);
        Report::create(['initiative_id' => $a->id, 'reason' => 'drugo', 'status' => 'resolved']);

        $response = $this->spa()->actingAs($admin)->getJson('/admin/stats')->assertOk();

        // nalozi: admin, u1, u2, nepotvrđen, brza prijava + 6 organizatora/volontera iz fabrika
        $users = $response->json('users');
        $this->assertSame(User::count(), $users['total']);
        $this->assertSame(User::whereNotNull('email_verified_at')->count(), $users['verified']);
        $this->assertSame(2, $users['unverified']);
        $this->assertSame(1, $users['quick']);
        $this->assertSame(1, $users['admins']);
        $this->assertSame($users['total'], $users['new7']);
        $this->assertSame($users['total'], $users['new30']);

        $response
            ->assertJsonPath('initiatives.total', 6)
            ->assertJsonPath('initiatives.new7', 6)
            ->assertJsonPath('initiatives.byStatus.upcoming', 3)
            ->assertJsonPath('initiatives.byStatus.ongoing', 0)
            ->assertJsonPath('initiatives.byStatus.finished', 1)
            ->assertJsonPath('initiatives.byStatus.permanent', 1)
            ->assertJsonPath('initiatives.byStatus.cancelled', 1)
            ->assertJsonPath('initiatives.byStatus.hidden', 1)
            ->assertJsonPath('initiatives.byCategory.0.slug', 'ciscenje')
            ->assertJsonPath('initiatives.byCategory.0.count', 5)
            ->assertJsonPath('initiatives.byCategory.1.slug', 'zelenilo')
            ->assertJsonPath('initiatives.byCategory.1.count', 1)
            ->assertJsonPath('initiatives.byCity.0.slug', 'nis')
            ->assertJsonPath('initiatives.byCity.0.count', 6)
            ->assertJsonPath('participations.confirmed', 2)
            ->assertJsonPath('participations.pending', 1)
            ->assertJsonPath('participations.cancelled', 1)
            ->assertJsonPath('participations.volunteers', 2)
            ->assertJsonPath('participations.new7', 2)
            ->assertJsonPath('reports.open', 2)
            ->assertJsonPath('reports.resolved', 1);
    }

    public function test_daily_series_have_no_gaps_and_end_today(): void
    {
        User::factory()->count(3)->create(['role' => 'admin']);

        $series = $this->spa()->actingAs(User::first())->getJson('/admin/stats')->assertOk()->json('series');

        foreach (['users', 'initiatives', 'participations'] as $name) {
            $this->assertCount(31, $series[$name], $name);
            $this->assertSame(now()->format('Y-m-d'), end($series[$name])['date'], $name);
        }
        $this->assertSame(3, end($series['users'])['count']);
        $this->assertSame(0, end($series['initiatives'])['count']);
        $dates = array_column($series['users'], 'date');
        $this->assertSame($dates, array_values(array_unique($dates)));
    }

    public function test_user_list_is_searchable_and_never_exposes_secrets(): void
    {
        $admin = $this->admin(['name' => 'Šef Adminović', 'email' => 'sef@example.com']);
        User::factory()->create(['name' => 'Ana Anić', 'email' => 'ana@example.com']);
        User::factory()->create(['name' => 'Marko Marković', 'email' => 'marko@example.com']);
        User::factory()->unverified()->create(['name' => 'Brza Prijava', 'email' => 'brza@example.com', 'password' => null]);
        $this->makeInitiative(['user_id' => User::where('email', 'ana@example.com')->value('id')]);

        $list = $this->spa()->actingAs($admin)->getJson('/admin/users')->assertOk();
        $list->assertJsonPath('meta.total', User::count());
        $this->assertStringNotContainsString('password', json_encode($list->json('data')));
        $this->assertStringNotContainsString('remember_token', json_encode($list->json('data')));

        $this->spa()->actingAs($admin)->getJson('/admin/users?q=ana')
            ->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.email', 'ana@example.com')
            ->assertJsonPath('data.0.initiatives', 1)
            ->assertJsonPath('data.0.hasPassword', true)
            ->assertJsonPath('data.0.emailVerified', true);

        $this->spa()->actingAs($admin)->getJson('/admin/users?q=brza@')
            ->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.hasPassword', false)
            ->assertJsonPath('data.0.emailVerified', false);

        $this->spa()->actingAs($admin)->getJson('/admin/users?role=admin')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.role', 'admin');

        // % se ne tretira kao džoker
        $this->spa()->actingAs($admin)->getJson('/admin/users?q=%25')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_user_list_is_for_admins_only(): void
    {
        $this->getJson('/admin/users')->assertUnauthorized();
        $this->spa()->actingAs(User::factory()->create())->getJson('/admin/users')->assertForbidden();
    }

    public function test_admin_can_grant_and_revoke_the_admin_role(): void
    {
        Notification::fake();
        $admin = $this->admin();
        $user = User::factory()->create(['name' => 'Ana']);

        $this->spa()->actingAs($admin)->postJson("/admin/users/{$user->id}/role", ['role' => 'admin'])
            ->assertOk()->assertJsonPath('user.role', 'admin');
        $this->assertTrue($user->fresh()->isAdmin());
        Notification::assertSentTo($user, RoleChanged::class, fn (RoleChanged $n) => $n->role === 'admin');

        // nova uloga važi odmah
        $this->spa()->actingAs($user->fresh())->getJson('/admin/stats')->assertOk();

        $this->spa()->actingAs($admin)->postJson("/admin/users/{$user->id}/role", ['role' => 'user'])
            ->assertOk()->assertJsonPath('user.role', 'user');
        $this->assertFalse($user->fresh()->isAdmin());
        Notification::assertSentTo($user, RoleChanged::class, fn (RoleChanged $n) => $n->role === 'user');
    }

    public function test_repeating_the_same_role_does_not_send_a_second_mail(): void
    {
        Notification::fake();
        $admin = $this->admin();
        $user = User::factory()->create();

        $this->spa()->actingAs($admin)->postJson("/admin/users/{$user->id}/role", ['role' => 'user'])->assertOk();

        Notification::assertNothingSent();
    }

    public function test_admin_cannot_change_their_own_role(): void
    {
        $admin = $this->admin();

        $this->spa()->actingAs($admin)->postJson("/admin/users/{$admin->id}/role", ['role' => 'user'])->assertStatus(422);

        $this->assertTrue($admin->fresh()->isAdmin());
    }

    public function test_only_verified_accounts_can_become_admins(): void
    {
        $admin = $this->admin();
        $unverified = User::factory()->unverified()->create();

        $this->spa()->actingAs($admin)->postJson("/admin/users/{$unverified->id}/role", ['role' => 'admin'])->assertStatus(422);

        $this->assertFalse($unverified->fresh()->isAdmin());
    }

    public function test_role_changes_are_validated_and_restricted(): void
    {
        $admin = $this->admin();
        $user = User::factory()->create();
        $other = User::factory()->create();

        $this->spa()->actingAs($admin)->postJson("/admin/users/{$user->id}/role", ['role' => 'superadmin'])
            ->assertStatus(422)->assertJsonValidationErrors(['role']);
        $this->spa()->actingAs($admin)->postJson('/admin/users/999999/role', ['role' => 'admin'])->assertNotFound();

        // obični korisnik ne može da postavi admina, čak ni sebe
        $this->spa()->actingAs($user)->postJson("/admin/users/{$other->id}/role", ['role' => 'admin'])->assertForbidden();
        $this->spa()->actingAs($user)->postJson("/admin/users/{$user->id}/role", ['role' => 'admin'])->assertForbidden();
        $this->assertFalse($user->fresh()->isAdmin());
        $this->assertFalse($other->fresh()->isAdmin());
    }

    public function test_role_cannot_be_set_through_profile_or_registration_endpoints(): void
    {
        Notification::fake();

        $this->spa()->postJson('/register', [
            'name' => 'Napadač',
            'email' => 'napadac@example.com',
            'password' => 'tajna-lozinka',
            'password_confirmation' => 'tajna-lozinka',
            'consent' => true,
            'role' => 'admin',
        ])->assertCreated();

        $this->assertSame('user', User::where('email', 'napadac@example.com')->value('role'));
    }
}
