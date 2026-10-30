<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\ParticipationConfirmed;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Tests\Concerns\MakesInitiatives;
use Tests\TestCase;

/**
 * Nalog nastao brzom prijavom na inicijativu (bez lozinke) mora lako da se pretvori u pravi nalog.
 */
class AccountActivationTest extends TestCase
{
    use MakesInitiatives;
    use RefreshDatabase;

    private function quickUser(): User
    {
        return User::factory()->unverified()->create(['name' => 'Drugar', 'email' => 'drugar@example.com', 'password' => null]);
    }

    private function registration(array $override = []): array
    {
        return array_merge([
            'name' => 'Neko Drugi',
            'email' => 'drugar@example.com',
            'password' => 'tajna-lozinka',
            'password_confirmation' => 'tajna-lozinka',
            'consent' => true,
        ], $override);
    }

    public function test_registering_with_a_quick_account_email_sends_an_activation_link_instead_of_an_error(): void
    {
        Notification::fake();
        $quick = $this->quickUser();

        $this->spa()->postJson('/register', $this->registration(['email' => 'Drugar@Example.com']))
            ->assertStatus(202)
            ->assertJsonPath('status', 'activation-sent')
            ->assertJsonPath('mailSent', true);

        Notification::assertSentTo($quick, ResetPassword::class);

        // niko ne može da preotme nalog preko obrasca: ni lozinka ni ime se ne menjaju, i niko se ne prijavljuje
        $this->assertSame(1, User::where('email', 'drugar@example.com')->count());
        $this->assertSame('Drugar', $quick->fresh()->name);
        $this->assertNull($quick->fresh()->password);
        $this->assertFalse($quick->fresh()->hasVerifiedEmail());
        $this->assertGuest('web');
    }

    public function test_registration_form_can_ask_whether_an_email_only_needs_activation(): void
    {
        $this->quickUser();
        User::factory()->create(['email' => 'pravi@example.com']);

        $this->postJson('/register/check', ['email' => 'Drugar@Example.com'])
            ->assertOk()->assertExactJson(['activation' => true]);

        // pravi nalog i nepoznat mejl izgledaju isto: ne otkriva se ko ima nalog
        $this->postJson('/register/check', ['email' => 'pravi@example.com'])->assertOk()->assertExactJson(['activation' => false]);
        $this->postJson('/register/check', ['email' => 'niko@example.com'])->assertOk()->assertExactJson(['activation' => false]);

        $this->postJson('/register/check', ['email' => 'nije-mejl'])->assertStatus(422);
        $this->postJson('/register/check', [])->assertStatus(422);
    }

    public function test_activation_can_be_requested_with_nothing_but_an_email(): void
    {
        Notification::fake();
        $quick = $this->quickUser();

        $this->spa()->postJson('/register', ['email' => 'drugar@example.com'])
            ->assertStatus(202)->assertJsonPath('status', 'activation-sent');

        Notification::assertSentTo($quick, ResetPassword::class);
    }

    public function test_registering_with_a_full_account_email_is_still_rejected(): void
    {
        Notification::fake();
        User::factory()->create(['email' => 'drugar@example.com']);

        $this->spa()->postJson('/register', $this->registration())
            ->assertStatus(422)->assertJsonValidationErrors(['email']);

        Notification::assertNothingSent();
    }

    public function test_repeated_activation_requests_do_not_flood_the_inbox(): void
    {
        Notification::fake();
        $this->quickUser();

        $this->spa()->postJson('/register', $this->registration())->assertStatus(202);
        $this->spa()->postJson('/register', $this->registration())->assertStatus(202);

        Notification::assertCount(1);
    }

    public function test_activation_mail_explains_what_to_do_and_regular_reset_mail_does_not(): void
    {
        $quick = $this->quickUser();
        $regular = User::factory()->create(['name' => 'Ana']);

        $activation = (new ResetPassword('moj-token'))->toMail($quick);
        $this->assertSame('Aktiviraj svoj nalog', $activation->subject);
        $this->assertStringContainsString('/nova-lozinka?token=moj-token', $activation->actionUrl);
        $this->assertStringContainsString('još nema lozinku', implode(' ', $activation->introLines));

        $reset = (new ResetPassword('moj-token'))->toMail($regular);
        $this->assertSame('Nova lozinka', $reset->subject);
    }

    public function test_full_activation_flow_ends_with_a_working_login(): void
    {
        $quick = $this->quickUser();
        $token = Password::createToken($quick);

        $this->postJson('/reset-password', [
            'token' => $token,
            'email' => 'drugar@example.com',
            'password' => 'nova-lozinka-123',
            'password_confirmation' => 'nova-lozinka-123',
        ])->assertOk();

        $this->assertTrue($quick->fresh()->hasVerifiedEmail());

        $this->spa()->postJson('/login', ['email' => 'drugar@example.com', 'password' => 'nova-lozinka-123'])
            ->assertOk()->assertJsonPath('user.email', 'drugar@example.com');
        $this->assertTrue(Hash::check('nova-lozinka-123', $quick->fresh()->password));
    }

    public function test_confirmation_mail_tells_account_less_volunteers_how_to_get_an_account(): void
    {
        $initiative = $this->makeInitiative();
        $quick = $this->quickUser();
        $regular = User::factory()->create();

        $forQuick = (new ParticipationConfirmed($this->confirmedParticipation($initiative, $quick)->load('initiative')))->toMail($quick);
        $this->assertStringContainsString('Registruj se', implode(' ', $forQuick->outroLines));

        $forRegular = (new ParticipationConfirmed($this->confirmedParticipation($initiative, $regular)->load('initiative')))->toMail($regular);
        $this->assertStringNotContainsString('Registruj se', implode(' ', $forRegular->outroLines));
    }

    public function test_admin_can_send_a_password_link_to_an_account(): void
    {
        Notification::fake();
        $admin = User::factory()->create(['role' => 'admin']);
        $quick = $this->quickUser();

        $this->spa()->actingAs($admin)->postJson("/admin/users/{$quick->id}/password-link")
            ->assertOk()->assertJsonPath('status', 'sent');

        Notification::assertSentTo($quick, ResetPassword::class);

        // odmah ponovo: ograničenje, da se isti čovek ne zaspe mejlovima
        $this->spa()->actingAs($admin)->postJson("/admin/users/{$quick->id}/password-link")->assertStatus(429);
        Notification::assertCount(1);
    }

    public function test_password_link_is_for_admins_only(): void
    {
        Notification::fake();
        $quick = $this->quickUser();

        $this->postJson("/admin/users/{$quick->id}/password-link")->assertUnauthorized();
        $this->spa()->actingAs(User::factory()->create())->postJson("/admin/users/{$quick->id}/password-link")->assertForbidden();

        Notification::assertNothingSent();
    }
}
