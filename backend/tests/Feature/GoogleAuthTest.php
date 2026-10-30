<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\Concerns\MakesInitiatives;
use Tests\TestCase;

class GoogleAuthTest extends TestCase
{
    use MakesInitiatives;
    use RefreshDatabase;

    private function configureGoogle(): void
    {
        config([
            'services.google.client_id' => 'test-client-id',
            'services.google.client_secret' => 'test-client-secret',
            'services.google.redirect' => 'http://localhost/api/auth/google/callback',
        ]);
    }

    /** Lažni Google: zamena koda za token i profil. */
    private function fakeGoogle(array $profile, int $tokenStatus = 200): void
    {
        Http::fake([
            'oauth2.googleapis.com/*' => Http::response($tokenStatus === 200 ? ['access_token' => 'tok'] : ['error' => 'invalid_grant'], $tokenStatus),
            'openidconnect.googleapis.com/*' => Http::response($profile),
        ]);
    }

    private function returnFromGoogle(string $state = 'stanje', string $from = '/profil')
    {
        return $this->withSession(['google_oauth_state' => $state, 'google_oauth_from' => $from])
            ->get('/auth/google/callback?code=kod-sa-googlea&state='.$state);
    }

    private function profile(array $override = []): array
    {
        return array_merge([
            'sub' => '1122334455',
            'email' => 'Novi@Example.com',
            'email_verified' => true,
            'name' => 'Novi Korisnik',
        ], $override);
    }

    private function front(string $path): string
    {
        return rtrim(config('app.url'), '/').$path;
    }

    public function test_providers_endpoint_tells_whether_google_is_configured(): void
    {
        config(['services.google.client_id' => null, 'services.google.client_secret' => null]);
        $this->getJson('/auth/providers')->assertOk()->assertExactJson(['google' => false]);

        $this->configureGoogle();
        $this->getJson('/auth/providers')->assertOk()->assertExactJson(['google' => true]);
    }

    public function test_redirect_sends_the_user_to_google_with_a_state(): void
    {
        $this->configureGoogle();

        $response = $this->get('/auth/google/redirect?from=/inicijative/abc');

        $response->assertRedirect();
        $url = $response->headers->get('Location');
        $this->assertStringStartsWith('https://accounts.google.com/o/oauth2/v2/auth?', $url);

        parse_str((string) parse_url($url, PHP_URL_QUERY), $query);
        $this->assertSame('test-client-id', $query['client_id']);
        $this->assertSame('http://localhost/api/auth/google/callback', $query['redirect_uri']);
        $this->assertSame('code', $query['response_type']);
        $this->assertSame('openid email profile', $query['scope']);
        $this->assertSame(40, strlen($query['state']));

        $response->assertSessionHas('google_oauth_state', $query['state']);
        $response->assertSessionHas('google_oauth_from', '/inicijative/abc');
    }

    public function test_redirect_never_accepts_an_external_return_address(): void
    {
        $this->configureGoogle();

        foreach (['//zlonamerni.example', 'https://zlonamerni.example', '/\\zlo', 'javascript:alert(1)'] as $bad) {
            $this->get('/auth/google/redirect?from='.urlencode($bad))->assertSessionHas('google_oauth_from', '/profil');
        }
    }

    public function test_redirect_without_configuration_returns_to_login_with_a_message(): void
    {
        config(['services.google.client_id' => null]);

        $this->get('/auth/google/redirect')->assertRedirect($this->front('/prijava?google=nije-podeseno'));
    }

    public function test_new_google_user_gets_a_verified_account_without_password_and_without_privileges(): void
    {
        $this->configureGoogle();
        $this->fakeGoogle($this->profile());

        $this->returnFromGoogle()->assertRedirect($this->front('/profil'));

        $user = User::where('email', 'novi@example.com')->firstOrFail();
        $this->assertSame('Novi Korisnik', $user->name);
        $this->assertSame('1122334455', $user->google_id);
        $this->assertNull($user->password);
        $this->assertTrue($user->hasVerifiedEmail());
        $this->assertSame('user', $user->fresh()->role);
        $this->assertAuthenticatedAs($user, 'web');
    }

    public function test_return_goes_to_the_page_the_user_came_from(): void
    {
        $this->configureGoogle();
        $this->fakeGoogle($this->profile());

        $this->returnFromGoogle('stanje', '/inicijative/abc')->assertRedirect($this->front('/inicijative/abc'));
    }

    public function test_existing_account_with_the_same_email_is_linked_and_keeps_its_role(): void
    {
        $this->configureGoogle();
        $admin = User::factory()->unverified()->create([
            'name' => 'Šef',
            'email' => 'sef@example.com',
            'role' => 'admin',
        ]);
        $this->fakeGoogle($this->profile(['email' => 'SEF@example.com', 'name' => 'Neko Drugi']));

        $this->returnFromGoogle()->assertRedirect($this->front('/profil'));

        $admin->refresh();
        $this->assertSame('1122334455', $admin->google_id);
        $this->assertTrue($admin->hasVerifiedEmail());
        $this->assertSame('Šef', $admin->name);
        $this->assertSame('admin', $admin->role);
        $this->assertSame(1, User::where('email', 'sef@example.com')->count());
        $this->assertAuthenticatedAs($admin, 'web');
    }

    public function test_quick_account_without_password_is_claimed_through_google(): void
    {
        $this->configureGoogle();
        $quick = User::factory()->unverified()->create(['email' => 'novi@example.com', 'password' => null]);
        $this->fakeGoogle($this->profile());

        $this->returnFromGoogle()->assertRedirect($this->front('/profil'));

        $this->assertTrue($quick->fresh()->hasVerifiedEmail());
        $this->assertSame('1122334455', $quick->fresh()->google_id);
        $this->assertAuthenticatedAs($quick, 'web');
    }

    public function test_returning_google_user_is_found_by_google_id_even_if_the_email_changed(): void
    {
        $this->configureGoogle();
        $user = User::factory()->create(['email' => 'staro@example.com']);
        $user->forceFill(['google_id' => '1122334455'])->save();
        $this->fakeGoogle($this->profile(['email' => 'novo@example.com']));

        $this->returnFromGoogle()->assertRedirect($this->front('/profil'));

        $this->assertAuthenticatedAs($user, 'web');
        $this->assertSame(1, User::count());
        $this->assertSame('staro@example.com', $user->fresh()->email);
    }

    public function test_an_account_linked_to_another_google_identity_is_not_taken_over(): void
    {
        $this->configureGoogle();
        $user = User::factory()->create(['email' => 'novi@example.com']);
        $user->forceFill(['google_id' => 'neko-drugi-sub'])->save();
        $this->fakeGoogle($this->profile());

        $this->returnFromGoogle()->assertRedirect($this->front('/prijava?google=greska'));

        $this->assertGuest('web');
    }

    public function test_unverified_google_email_is_rejected(): void
    {
        $this->configureGoogle();
        $this->fakeGoogle($this->profile(['email_verified' => false]));

        $this->returnFromGoogle()->assertRedirect($this->front('/prijava?google=nepotvrdjen'));

        $this->assertGuest('web');
        $this->assertSame(0, User::count());
    }

    public function test_wrong_or_missing_state_is_rejected_before_any_request_to_google(): void
    {
        $this->configureGoogle();
        Http::fake();

        $this->withSession(['google_oauth_state' => 'pravo'])->get('/auth/google/callback?code=x&state=pogresno')
            ->assertRedirect($this->front('/prijava?google=greska'));
        $this->get('/auth/google/callback?code=x&state=bilo-sta')->assertRedirect($this->front('/prijava?google=greska'));
        $this->withSession(['google_oauth_state' => 'pravo'])->get('/auth/google/callback?state=pravo')
            ->assertRedirect($this->front('/prijava?google=greska'));

        Http::assertNothingSent();
        $this->assertGuest('web');
    }

    public function test_state_cannot_be_used_twice(): void
    {
        $this->configureGoogle();
        $this->fakeGoogle($this->profile());

        $this->returnFromGoogle('jednokratno')->assertRedirect($this->front('/profil'));

        // isti povratak bez nove sesije ne prolazi
        $this->app['auth']->forgetGuards();
        $this->get('/auth/google/callback?code=x&state=jednokratno')->assertRedirect($this->front('/prijava?google=greska'));
    }

    public function test_user_who_cancels_at_google_returns_to_login(): void
    {
        $this->configureGoogle();
        Http::fake();

        $this->withSession(['google_oauth_state' => 'stanje'])
            ->get('/auth/google/callback?error=access_denied&state=stanje')
            ->assertRedirect($this->front('/prijava?google=odbijeno'));

        Http::assertNothingSent();
        $this->assertGuest('web');
    }

    public function test_failed_code_exchange_does_not_log_anyone_in(): void
    {
        $this->configureGoogle();
        $this->fakeGoogle($this->profile(), tokenStatus: 400);

        $this->returnFromGoogle()->assertRedirect($this->front('/prijava?google=greska'));

        $this->assertGuest('web');
        $this->assertSame(0, User::count());
    }

    public function test_the_secret_goes_only_to_google_and_the_profile_is_read_with_the_token(): void
    {
        $this->configureGoogle();
        $this->fakeGoogle($this->profile());

        $this->returnFromGoogle();

        Http::assertSent(fn ($request) => str_starts_with($request->url(), 'https://oauth2.googleapis.com/token')
            && $request['client_secret'] === 'test-client-secret'
            && $request['grant_type'] === 'authorization_code'
            && $request['code'] === 'kod-sa-googlea');
        Http::assertSent(fn ($request) => str_starts_with($request->url(), 'https://openidconnect.googleapis.com/')
            && $request->hasHeader('Authorization', 'Bearer tok'));
    }
}
