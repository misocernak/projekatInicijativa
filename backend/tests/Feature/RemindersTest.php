<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\InitiativeReminder;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\MakesInitiatives;
use Tests\TestCase;

class RemindersTest extends TestCase
{
    use MakesInitiatives;
    use RefreshDatabase;

    /** Potvrđena prijava od pre nekoliko sati, da ne važi pravilo "tek se prijavio". */
    private function seasoned(\App\Models\Initiative $initiative, ?User $user = null)
    {
        $participation = $this->confirmedParticipation($initiative, $user);
        $participation->forceFill(['confirmed_at' => now()->subHours(5)])->save();

        return $participation;
    }

    private function startingIn(int $hours, array $attrs = []): \App\Models\Initiative
    {
        return $this->makeInitiative(array_merge([
            'starts_at' => now()->addHours($hours),
            'ends_at' => now()->addHours($hours + 2),
        ], $attrs));
    }

    public function test_confirmed_volunteer_gets_one_reminder_the_day_before(): void
    {
        Notification::fake();
        $user = User::factory()->create();
        $participation = $this->seasoned($this->startingIn(10), $user);

        $this->artisan('initiatives:send-reminders')->assertSuccessful();

        Notification::assertSentTo($user, InitiativeReminder::class);
        $this->assertNotNull($participation->fresh()->reminded_at);

        $this->artisan('initiatives:send-reminders')->assertSuccessful();
        Notification::assertCount(1);
    }

    public function test_no_reminder_when_it_does_not_apply(): void
    {
        Notification::fake();

        // prekasno za dan unapred: počinje tek za 3 dana
        $this->seasoned($this->startingIn(72));
        // već počela
        $this->seasoned($this->startingIn(-3, ['ends_at' => now()->addHour()]));
        // otkazana i sakrivena inicijativa
        $this->seasoned($this->startingIn(10, ['cancelled_at' => now()]));
        $this->seasoned($this->startingIn(10, ['hidden_at' => now()]));
        // trajna nema početak
        $this->seasoned($this->makeInitiative(['kind' => 'permanent', 'starts_at' => null, 'ends_at' => null]));
        // prijava čeka potvrdu ili je otkazana
        $soon = $this->startingIn(10);
        $this->pendingParticipation($soon);
        $cancelled = $this->seasoned($soon);
        $cancelled->forceFill(['status' => 'cancelled'])->save();
        // upravo se prijavio, već ima mejl sa detaljima
        $this->confirmedParticipation($this->startingIn(10));

        $this->artisan('initiatives:send-reminders')->assertSuccessful();

        Notification::assertNothingSent();
    }

    public function test_schedule_registers_reminders_and_backups(): void
    {
        // pokretanje konzole učitava routes/console.php
        $this->artisan('list')->assertSuccessful();

        $commands = collect(app(Schedule::class)->events())->map(fn ($event) => (string) $event->command);

        $this->assertTrue($commands->contains(fn ($c) => str_contains($c, 'initiatives:send-reminders')));
        $this->assertTrue($commands->contains(fn ($c) => str_contains($c, 'db:backup')));
    }
}
