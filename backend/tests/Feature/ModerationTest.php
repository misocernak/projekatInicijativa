<?php

namespace Tests\Feature;

use App\Models\Report;
use App\Models\User;
use App\Notifications\InitiativeHidden;
use App\Notifications\ReportReceived;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\MakesInitiatives;
use Tests\TestCase;

class ModerationTest extends TestCase
{
    use MakesInitiatives;
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    public function test_guest_can_report_and_admins_are_notified(): void
    {
        Notification::fake();
        $admin = $this->admin();
        $regular = User::factory()->create();
        $initiative = $this->makeInitiative();

        $this->postJson("/initiatives/{$initiative->id}/report", [
            'reason' => 'spam',
            'message' => 'Reklama, nije inicijativa.',
            'email' => 'prijavljivac@example.com',
        ])->assertCreated();

        $this->assertDatabaseHas('reports', [
            'initiative_id' => $initiative->id,
            'user_id' => null,
            'reporter_email' => 'prijavljivac@example.com',
            'reason' => 'spam',
            'status' => 'open',
        ]);
        Notification::assertSentTo($admin, ReportReceived::class);
        Notification::assertNotSentTo($regular, ReportReceived::class);
    }

    public function test_admin_can_delete_an_initiative_but_regular_users_cannot(): void
    {
        $initiative = $this->makeInitiative();
        $regular = User::factory()->create();

        $this->actingAs($regular)->spa()->deleteJson("/admin/initiatives/{$initiative->id}")->assertForbidden();
        $this->assertDatabaseHas('initiatives', ['id' => $initiative->id]);

        $this->actingAs($this->admin())->spa()->deleteJson("/admin/initiatives/{$initiative->id}")->assertOk();
        $this->assertDatabaseMissing('initiatives', ['id' => $initiative->id]);
    }

    public function test_report_validates_reason(): void
    {
        $initiative = $this->makeInitiative();

        $this->postJson("/initiatives/{$initiative->id}/report", [])->assertStatus(422)->assertJsonValidationErrors(['reason']);
        $this->postJson("/initiatives/{$initiative->id}/report", ['reason' => 'nesto'])->assertStatus(422);
        $this->assertSame(0, Report::count());
    }

    public function test_same_user_does_not_create_duplicate_open_reports(): void
    {
        Notification::fake();
        $initiative = $this->makeInitiative();
        $user = User::factory()->create();

        $this->spa()->actingAs($user)->postJson("/initiatives/{$initiative->id}/report", ['reason' => 'lazno'])->assertCreated();
        $this->spa()->actingAs($user)->postJson("/initiatives/{$initiative->id}/report", ['reason' => 'lazno'])->assertOk();

        $this->assertSame(1, Report::count());
    }

    public function test_reporting_is_rate_limited(): void
    {
        Notification::fake();
        $initiative = $this->makeInitiative();

        foreach (range(1, 5) as $i) {
            $this->postJson("/initiatives/{$initiative->id}/report", ['reason' => 'spam'])->assertCreated();
        }

        $this->postJson("/initiatives/{$initiative->id}/report", ['reason' => 'spam'])->assertStatus(429);
    }

    public function test_only_admins_see_the_report_queue(): void
    {
        $initiative = $this->makeInitiative(['title' => 'Sumnjiva inicijativa']);
        Report::create(['initiative_id' => $initiative->id, 'reason' => 'spam', 'message' => 'Reklama']);

        $this->getJson('/admin/reports')->assertUnauthorized();
        $this->spa()->actingAs(User::factory()->create())->getJson('/admin/reports')->assertForbidden();

        $this->spa()->actingAs($this->admin())->getJson('/admin/reports')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.reason', 'spam')
            ->assertJsonPath('data.0.initiative.title', 'Sumnjiva inicijativa')
            ->assertJsonPath('data.0.initiative.hidden', false);
    }

    public function test_admin_can_resolve_reports_and_filter_by_status(): void
    {
        $initiative = $this->makeInitiative();
        $report = Report::create(['initiative_id' => $initiative->id, 'reason' => 'drugo']);
        $admin = $this->admin();

        $this->spa()->actingAs($admin)->postJson("/admin/reports/{$report->id}/resolve")->assertOk();

        $this->assertSame('resolved', $report->fresh()->status);
        $this->assertSame($admin->id, $report->fresh()->handled_by);
        $this->spa()->actingAs($admin)->getJson('/admin/reports')->assertJsonCount(0, 'data');
        $this->spa()->actingAs($admin)->getJson('/admin/reports?status=resolved')->assertJsonCount(1, 'data');
        $this->spa()->actingAs($admin)->getJson('/admin/reports?status=all')->assertJsonCount(1, 'data');
    }

    public function test_hiding_removes_the_initiative_from_public_view_but_not_from_owner_or_admin(): void
    {
        Notification::fake();
        $owner = User::factory()->create();
        $initiative = $this->makeInitiative(['user_id' => $owner->id, 'title' => 'Sakrij me']);
        $this->makeInitiative(['title' => 'Ostaje vidljiva']);
        $report = Report::create(['initiative_id' => $initiative->id, 'reason' => 'spam']);
        $admin = $this->admin();

        $this->spa()->actingAs($admin)->postJson("/admin/initiatives/{$initiative->id}/hide")->assertOk();

        // javnost (bez prijave): nema je ni u listi ni na detalju
        $this->app['auth']->forgetGuards();
        $this->getJson('/initiatives')->assertJsonCount(1, 'data')->assertJsonPath('data.0.title', 'Ostaje vidljiva');
        $this->getJson("/initiatives/{$initiative->id}")->assertNotFound();

        // organizator i admin je i dalje vide, uz oznaku
        $this->spa()->actingAs($owner)->getJson("/initiatives/{$initiative->id}")
            ->assertOk()->assertJsonPath('data.hidden', true);
        $this->spa()->actingAs($admin)->getJson("/initiatives/{$initiative->id}")->assertOk();
        $this->spa()->actingAs($owner)->getJson('/me/initiatives')->assertJsonPath('data.0.hidden', true);

        // prijave se zatvaraju, otvorene prijave sadržaja se rešavaju, organizator je obavešten
        $this->spa()->actingAs(User::factory()->create())->postJson("/initiatives/{$initiative->id}/join")->assertStatus(422);
        $this->assertSame('resolved', $report->fresh()->status);
        Notification::assertSentTo($owner, InitiativeHidden::class);
    }

    public function test_unhide_restores_visibility(): void
    {
        $initiative = $this->makeInitiative(['hidden_at' => now()]);
        $admin = $this->admin();

        $this->getJson("/initiatives/{$initiative->id}")->assertNotFound();

        $this->spa()->actingAs($admin)->postJson("/admin/initiatives/{$initiative->id}/unhide")->assertOk();

        $this->getJson("/initiatives/{$initiative->id}")->assertOk()->assertJsonMissingPath('data.hidden');
    }

    public function test_organizer_cannot_hide_or_unhide_even_their_own_initiative(): void
    {
        $owner = User::factory()->create();
        $initiative = $this->makeInitiative(['user_id' => $owner->id]);

        $this->spa()->actingAs($owner)->postJson("/admin/initiatives/{$initiative->id}/hide")->assertForbidden();
        $this->spa()->actingAs($owner)->postJson("/admin/initiatives/{$initiative->id}/unhide")->assertForbidden();
        $this->assertNull($initiative->fresh()->hidden_at);
    }

    public function test_hidden_initiative_cannot_be_reported(): void
    {
        $initiative = $this->makeInitiative(['hidden_at' => now()]);

        $this->postJson("/initiatives/{$initiative->id}/report", ['reason' => 'spam'])->assertNotFound();
    }

    public function test_make_admin_command_grants_and_revokes_the_role(): void
    {
        $user = User::factory()->create(['email' => 'ana@example.com']);

        $this->artisan('user:admin', ['email' => 'ANA@example.com'])->assertSuccessful();
        $this->assertTrue($user->fresh()->isAdmin());

        $this->artisan('user:admin', ['email' => 'ana@example.com', '--revoke' => true])->assertSuccessful();
        $this->assertFalse($user->fresh()->isAdmin());
    }

    public function test_make_admin_command_fails_for_unknown_account(): void
    {
        $this->artisan('user:admin', ['email' => 'niko@example.com'])->assertFailed();
    }
}
