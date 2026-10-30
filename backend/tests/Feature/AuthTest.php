<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    /** Zahtev stiže sa "fronta": Referer iz liste stateful domena, pa Sanctum pokreće sesiju. */
    private function spa(): static
    {
        return $this->withHeader('Referer', 'http://localhost');
    }

    private function registrationPayload(array $override = []): array
    {
        return array_merge([
            'name' => 'Ana Anić',
            'email' => 'ana@example.com',
            'password' => 'tajna-lozinka',
            'password_confirmation' => 'tajna-lozinka',
            'consent' => true,
        ], $override);
    }

    private function frontUrl(string $path): string
    {
        return rtrim(config('app.url'), '/').$path;
    }

    public function test_register_creates_account_logs_in_and_sends_verification(): void
    {
        Notification::fake();
        City::create(['slug' => 'nis', 'name' => 'Niš', 'lat' => 43.32, 'lng' => 21.89]);

        $this->spa()->postJson('/register', $this->registrationPayload(['city' => 'nis']))
            ->assertCreated()
            ->assertJsonPath('user.name', 'Ana Anić')
            ->assertJsonPath('user.cityId', 'nis')
            ->assertJsonPath('user.emailVerified', false)
            ->assertJsonPath('user.role', 'user')
            ->assertJsonPath('verificationEmailSent', true);

        $user = User::where('email', 'ana@example.com')->firstOrFail();
        $this->assertTrue(Hash::check('tajna-lozinka', $user->password));
        $this->assertAuthenticatedAs($user, 'web');
        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_register_lowercases_email(): void
    {
        Notification::fake();

        $this->spa()->postJson('/register', $this->registrationPayload(['email' => 'Ana@Example.COM']))->assertCreated();

        $this->assertDatabaseHas('users', ['email' => 'ana@example.com']);
    }

    public function test_register_validates_input(): void
    {
        Notification::fake();
        User::factory()->create(['email' => 'zauzet@example.com']);

        $this->spa()->postJson('/register', $this->registrationPayload(['email' => 'zauzet@example.com']))
            ->assertStatus(422)->assertJsonValidationErrors(['email']);

        $this->spa()->postJson('/register', $this->registrationPayload(['password' => 'kratko', 'password_confirmation' => 'kratko']))
            ->assertStatus(422)->assertJsonValidationErrors(['password']);

        $this->spa()->postJson('/register', $this->registrationPayload(['password_confirmation' => 'drugacija-lozinka']))
            ->assertStatus(422)->assertJsonValidationErrors(['password']);

        $this->spa()->postJson('/register', $this->registrationPayload(['consent' => false]))
            ->assertStatus(422)->assertJsonValidationErrors(['consent']);

        $this->spa()->postJson('/register', $this->registrationPayload(['city' => 'ne-postoji']))
            ->assertStatus(422)->assertJsonValidationErrors(['city']);
    }

    public function test_register_cannot_set_role(): void
    {
        Notification::fake();

        $this->spa()->postJson('/register', $this->registrationPayload(['role' => 'admin']))->assertCreated();

        $this->assertSame('user', User::where('email', 'ana@example.com')->value('role'));
    }

    public function test_register_requires_a_browser_session(): void
    {
        // bez Origin/Referer fronta nema sesije, pa zahtev nema smisla
        $this->postJson('/register', $this->registrationPayload())->assertStatus(400);
    }

    public function test_login_succeeds_with_correct_credentials(): void
    {
        User::factory()->create(['email' => 'ana@example.com', 'password' => 'tajna-lozinka']);

        $this->spa()->postJson('/login', ['email' => 'ANA@example.com', 'password' => 'tajna-lozinka'])
            ->assertOk()
            ->assertJsonPath('user.email', 'ana@example.com');

        $this->assertAuthenticated('web');
    }

    public function test_login_fails_with_wrong_password_or_unknown_email(): void
    {
        User::factory()->create(['email' => 'ana@example.com', 'password' => 'tajna-lozinka']);

        $this->spa()->postJson('/login', ['email' => 'ana@example.com', 'password' => 'pogresna'])
            ->assertStatus(422)->assertJsonValidationErrors(['email']);
        $this->spa()->postJson('/login', ['email' => 'niko@example.com', 'password' => 'tajna-lozinka'])
            ->assertStatus(422)->assertJsonValidationErrors(['email']);
        $this->assertGuest('web');
    }

    public function test_quick_account_without_password_cannot_log_in(): void
    {
        User::factory()->create(['email' => 'brza@example.com', 'password' => null]);

        $this->spa()->postJson('/login', ['email' => 'brza@example.com', 'password' => ''])->assertStatus(422);
        $this->spa()->postJson('/login', ['email' => 'brza@example.com', 'password' => 'bilo-sta'])->assertStatus(422);
        $this->assertGuest('web');
    }

    public function test_me_requires_login_and_returns_profile(): void
    {
        $this->getJson('/me')->assertUnauthorized();
        // i običan (ne-JSON) zahtev dobija JSON, a ne preusmeravanje
        $this->get('/me')->assertUnauthorized();

        $user = User::factory()->create(['name' => 'Marko']);

        $this->spa()->actingAs($user)->getJson('/me')
            ->assertOk()
            ->assertJsonPath('user.id', (string) $user->id)
            ->assertJsonPath('user.name', 'Marko')
            ->assertJsonPath('user.emailVerified', true)
            ->assertJsonMissingPath('user.password');
    }

    public function test_logout_ends_the_session(): void
    {
        $user = User::factory()->create();

        $this->spa()->actingAs($user)->postJson('/logout')->assertOk();

        $this->assertGuest('web');
    }

    public function test_signed_link_verifies_email_and_redirects_to_front(): void
    {
        $user = User::factory()->unverified()->create();
        $url = URL::temporarySignedRoute('verification.verify', now()->addHour(), [
            'id' => $user->id,
            'hash' => sha1($user->email),
        ]);

        $this->get($url)->assertRedirect($this->frontUrl('/potvrda-mejla?status=ok'));

        $this->assertTrue($user->fresh()->hasVerifiedEmail());
    }

    public function test_verification_rejects_wrong_hash_and_bad_signature(): void
    {
        $user = User::factory()->unverified()->create();

        $wrongHash = URL::temporarySignedRoute('verification.verify', now()->addHour(), [
            'id' => $user->id,
            'hash' => sha1('neki-drugi@example.com'),
        ]);
        $this->get($wrongHash)->assertRedirect($this->frontUrl('/potvrda-mejla?status=invalid'));

        $unsigned = "/email/verify/{$user->id}/".sha1($user->email);
        $this->get($unsigned)->assertRedirect($this->frontUrl('/potvrda-mejla?status=invalid'));

        $this->assertFalse($user->fresh()->hasVerifiedEmail());
    }

    public function test_resend_verification_only_for_unverified_users(): void
    {
        Notification::fake();
        $unverified = User::factory()->unverified()->create();
        $verified = User::factory()->create();

        $this->spa()->actingAs($unverified)->postJson('/email/verification-notification')
            ->assertOk()->assertJsonPath('status', 'sent');
        Notification::assertSentTo($unverified, VerifyEmail::class);

        $this->spa()->actingAs($verified)->postJson('/email/verification-notification')
            ->assertOk()->assertJsonPath('status', 'already-verified');
        Notification::assertNotSentTo($verified, VerifyEmail::class);
    }

    public function test_forgot_password_never_reveals_whether_account_exists(): void
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'ana@example.com']);

        $this->postJson('/forgot-password', ['email' => 'ana@example.com'])->assertOk()->assertJsonPath('status', 'ok');
        $this->postJson('/forgot-password', ['email' => 'niko@example.com'])->assertOk()->assertJsonPath('status', 'ok');

        Notification::assertSentTo($user, ResetPassword::class);
        Notification::assertCount(1);
    }

    public function test_reset_password_sets_password_and_verifies_a_quick_account(): void
    {
        $quick = User::factory()->unverified()->create(['email' => 'brza@example.com', 'password' => null]);
        $token = Password::createToken($quick);

        $this->postJson('/reset-password', [
            'token' => $token,
            'email' => 'brza@example.com',
            'password' => 'nova-lozinka-123',
            'password_confirmation' => 'nova-lozinka-123',
        ])->assertOk();

        $quick->refresh();
        $this->assertTrue(Hash::check('nova-lozinka-123', $quick->password));
        $this->assertTrue($quick->hasVerifiedEmail());
    }

    public function test_reset_password_rejects_invalid_token(): void
    {
        $user = User::factory()->create(['email' => 'ana@example.com']);

        $this->postJson('/reset-password', [
            'token' => 'los-token',
            'email' => 'ana@example.com',
            'password' => 'nova-lozinka-123',
            'password_confirmation' => 'nova-lozinka-123',
        ])->assertStatus(422)->assertJsonValidationErrors(['email']);

        $this->assertFalse(Hash::check('nova-lozinka-123', $user->fresh()->password));
    }

    public function test_mail_templates_point_to_the_right_places(): void
    {
        $user = User::factory()->unverified()->create(['name' => 'Ana']);

        $verify = (new VerifyEmail)->toMail($user);
        $this->assertStringContainsString('/email/verify/'.$user->id.'/', $verify->actionUrl);
        $this->assertSame('Potvrdi svoju mejl adresu', $verify->subject);

        $reset = (new ResetPassword('moj-token'))->toMail($user);
        $this->assertStringContainsString($this->frontUrl('/nova-lozinka?token=moj-token'), $reset->actionUrl);
    }
}
