<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\MakesInitiatives;
use Tests\TestCase;

class TurnstileTest extends TestCase
{
    use MakesInitiatives;
    use RefreshDatabase;

    private function payload(): array
    {
        return [
            'name' => 'Ana Anić',
            'email' => 'ana@example.com',
            'password' => 'tajna-lozinka',
            'password_confirmation' => 'tajna-lozinka',
            'consent' => true,
        ];
    }

    public function test_check_is_off_without_secret(): void
    {
        Notification::fake();
        config(['services.turnstile.secret' => null]);

        $this->spa()->postJson('/register', $this->payload())->assertCreated();
    }

    public function test_missing_token_is_rejected(): void
    {
        config(['services.turnstile.secret' => 'secret']);
        Http::fake();

        $this->spa()->postJson('/register', $this->payload())
            ->assertStatus(422)->assertJsonValidationErrors(['captcha']);
        $this->assertDatabaseCount('users', 0);
        Http::assertNothingSent();
    }

    public function test_valid_token_passes_and_failed_token_is_rejected(): void
    {
        Notification::fake();
        config(['services.turnstile.secret' => 'secret']);
        Http::fake(['challenges.cloudflare.com/*' => Http::sequence()
            ->push(['success' => true])
            ->push(['success' => false, 'error-codes' => ['invalid-input-response']])]);

        $this->spa()->withHeader('X-Turnstile-Token', 'dobar')->postJson('/register', $this->payload())->assertCreated();

        $this->spa()->withHeader('X-Turnstile-Token', 'los')
            ->postJson('/login', ['email' => 'ana@example.com', 'password' => 'tajna-lozinka'])
            ->assertStatus(422)->assertJsonValidationErrors(['captcha']);
    }

    public function test_logged_in_users_skip_check_on_join(): void
    {
        Notification::fake();
        config(['services.turnstile.secret' => 'secret']);
        Http::fake();
        $initiative = $this->makeInitiative();

        $this->actingAs(User::factory()->create())->spa()
            ->postJson("/initiatives/{$initiative->id}/join")->assertSuccessful();
        Http::assertNothingSent();
    }

    public function test_providers_exposes_site_key_only_when_configured(): void
    {
        config(['services.turnstile.site_key' => 'site', 'services.turnstile.secret' => null]);
        $this->getJson('/auth/providers')->assertJsonPath('turnstile', null);

        config(['services.turnstile.secret' => 'secret']);
        $this->getJson('/auth/providers')->assertJsonPath('turnstile', 'site');
    }
}
