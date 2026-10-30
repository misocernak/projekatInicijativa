<?php

namespace Tests\Feature;

use App\Models\Participation;
use App\Models\User;
use App\Notifications\ConfirmParticipation;
use App\Notifications\ParticipationConfirmed;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\Concerns\MakesInitiatives;
use Tests\TestCase;

class ParticipationTest extends TestCase
{
    use MakesInitiatives;
    use RefreshDatabase;

    private function guestPayload(array $override = []): array
    {
        return array_merge(['name' => 'Gost Gostić', 'email' => 'gost@example.com', 'consent' => true], $override);
    }

    private function confirmUrl(Participation $participation): string
    {
        return URL::temporarySignedRoute('participation.confirm', now()->addDay(), ['participation' => $participation->id]);
    }

    public function test_verified_user_is_confirmed_immediately(): void
    {
        Notification::fake();
        $initiative = $this->makeInitiative();
        $user = User::factory()->create();

        $this->spa()->actingAs($user)->postJson("/initiatives/{$initiative->id}/join")
            ->assertCreated()->assertJsonPath('status', 'confirmed');

        $this->assertDatabaseHas('participations', [
            'initiative_id' => $initiative->id,
            'user_id' => $user->id,
            'status' => 'confirmed',
        ]);
        Notification::assertSentTo($user, ParticipationConfirmed::class);
        $this->getJson("/initiatives/{$initiative->id}")->assertJsonPath('data.participants', 1);
    }

    public function test_joining_twice_is_harmless(): void
    {
        Notification::fake();
        $initiative = $this->makeInitiative();
        $user = User::factory()->create();

        $this->spa()->actingAs($user)->postJson("/initiatives/{$initiative->id}/join")->assertCreated();
        $this->spa()->actingAs($user)->postJson("/initiatives/{$initiative->id}/join")
            ->assertOk()->assertJsonPath('status', 'confirmed');

        $this->assertSame(1, Participation::count());
        Notification::assertCount(1);
    }

    public function test_unverified_user_must_confirm_through_the_link(): void
    {
        Notification::fake();
        $initiative = $this->makeInitiative();
        $user = User::factory()->unverified()->create();

        $this->spa()->actingAs($user)->postJson("/initiatives/{$initiative->id}/join")
            ->assertStatus(202)->assertJsonPath('status', 'pending');

        Notification::assertSentTo($user, ConfirmParticipation::class);
        $this->getJson("/initiatives/{$initiative->id}")->assertJsonPath('data.participants', 0);
    }

    public function test_guest_creates_a_quick_account_and_waits_for_confirmation(): void
    {
        Notification::fake();
        $initiative = $this->makeInitiative();

        $this->spa()->postJson("/initiatives/{$initiative->id}/join", $this->guestPayload())
            ->assertStatus(202)
            ->assertJsonPath('status', 'pending');

        $user = User::where('email', 'gost@example.com')->firstOrFail();
        $this->assertNull($user->password);
        $this->assertFalse($user->hasVerifiedEmail());
        $this->assertDatabaseHas('participations', ['user_id' => $user->id, 'status' => 'pending']);
        Notification::assertSentTo($user, ConfirmParticipation::class);
        $this->assertGuest('web');
        $this->getJson("/initiatives/{$initiative->id}")->assertJsonPath('data.participants', 0);
    }

    public function test_guest_join_never_changes_an_existing_account(): void
    {
        Notification::fake();
        $initiative = $this->makeInitiative();
        $existing = User::factory()->create(['name' => 'Pravo Ime', 'email' => 'gost@example.com', 'password' => 'moja-lozinka']);
        $hashBefore = $existing->password;

        $this->spa()->postJson("/initiatives/{$initiative->id}/join", $this->guestPayload(['name' => 'Neko Drugi']))
            ->assertStatus(202);

        $existing->refresh();
        $this->assertSame('Pravo Ime', $existing->name);
        $this->assertSame($hashBefore, $existing->password);
        $this->assertTrue(Hash::check('moja-lozinka', $existing->password));
        $this->assertSame(1, User::where('email', 'gost@example.com')->count());
        $this->assertDatabaseHas('participations', ['user_id' => $existing->id, 'status' => 'pending']);
        $this->assertGuest('web');
    }

    public function test_guest_join_validates_input(): void
    {
        $initiative = $this->makeInitiative();

        $this->spa()->postJson("/initiatives/{$initiative->id}/join", $this->guestPayload(['consent' => false]))
            ->assertStatus(422)->assertJsonValidationErrors(['consent']);
        $this->spa()->postJson("/initiatives/{$initiative->id}/join", $this->guestPayload(['email' => 'nije-mejl']))
            ->assertStatus(422)->assertJsonValidationErrors(['email']);
        $this->spa()->postJson("/initiatives/{$initiative->id}/join", $this->guestPayload(['name' => '']))
            ->assertStatus(422)->assertJsonValidationErrors(['name']);

        $this->assertSame(0, Participation::count());
    }

    public function test_one_email_cannot_be_used_to_flood_an_inbox(): void
    {
        Notification::fake();
        $initiative = $this->makeInitiative();

        foreach (range(1, 3) as $i) {
            $this->spa()->postJson("/initiatives/{$initiative->id}/join", $this->guestPayload())->assertStatus(202);
        }

        $this->spa()->postJson("/initiatives/{$initiative->id}/join", $this->guestPayload())->assertStatus(429);
    }

    public function test_signed_link_confirms_participation_and_verifies_the_mailbox(): void
    {
        Notification::fake();
        $initiative = $this->makeInitiative();
        $user = User::factory()->unverified()->create(['password' => null]);
        $participation = $this->pendingParticipation($initiative, $user);

        $this->get($this->confirmUrl($participation))
            ->assertRedirect($this->frontUrl("/inicijative/{$initiative->id}?prijava=potvrdjena"));

        $this->assertSame('confirmed', $participation->fresh()->status);
        $this->assertTrue($user->fresh()->hasVerifiedEmail());
        Notification::assertSentTo($user, ParticipationConfirmed::class);
        $this->getJson("/initiatives/{$initiative->id}")->assertJsonPath('data.participants', 1);
    }

    public function test_confirming_twice_sends_details_only_once(): void
    {
        Notification::fake();
        $initiative = $this->makeInitiative();
        $participation = $this->pendingParticipation($initiative);

        $this->get($this->confirmUrl($participation))->assertRedirect();
        $this->get($this->confirmUrl($participation))->assertRedirect();

        Notification::assertCount(1);
    }

    public function test_confirmation_is_refused_when_the_initiative_filled_up_meanwhile(): void
    {
        Notification::fake();
        $initiative = $this->makeInitiative(['capacity' => 1]);
        $this->confirmedParticipation($initiative);
        $waiting = $this->pendingParticipation($initiative);

        $this->get($this->confirmUrl($waiting))
            ->assertRedirect($this->frontUrl("/inicijative/{$initiative->id}?prijava=popunjeno"));

        $this->assertSame('pending', $waiting->fresh()->status);
        Notification::assertNothingSent();
    }

    public function test_confirmation_is_refused_for_a_cancelled_initiative(): void
    {
        $initiative = $this->makeInitiative(['cancelled_at' => now()]);
        $participation = $this->pendingParticipation($initiative);

        $this->get($this->confirmUrl($participation))
            ->assertRedirect($this->frontUrl("/inicijative/{$initiative->id}?prijava=zatvorena"));

        $this->assertSame('pending', $participation->fresh()->status);
    }

    public function test_tampered_or_unsigned_confirmation_link_is_rejected(): void
    {
        $initiative = $this->makeInitiative();
        $participation = $this->pendingParticipation($initiative);

        $this->get("/participations/{$participation->id}/confirm")
            ->assertRedirect($this->frontUrl('/potvrda-mejla?status=invalid'));

        $this->assertSame('pending', $participation->fresh()->status);
    }

    public function test_cannot_join_full_cancelled_or_finished_initiatives(): void
    {
        $full = $this->makeInitiative(['capacity' => 1]);
        $this->confirmedParticipation($full);
        $cancelled = $this->makeInitiative(['cancelled_at' => now()]);
        $finished = $this->makeInitiative([
            'starts_at' => now()->subDays(2),
            'ends_at' => now()->subDays(2)->addHours(2),
        ]);
        $user = User::factory()->create();

        $this->spa()->actingAs($user)->postJson("/initiatives/{$full->id}/join")->assertStatus(422);
        $this->spa()->actingAs($user)->postJson("/initiatives/{$cancelled->id}/join")->assertStatus(422);
        $this->spa()->actingAs($user)->postJson("/initiatives/{$finished->id}/join")->assertStatus(422);

        $this->assertSame(0, Participation::where('user_id', $user->id)->count());
    }

    public function test_permanent_initiative_stays_open(): void
    {
        Notification::fake();
        $initiative = $this->makeInitiative(['kind' => 'permanent', 'starts_at' => null, 'ends_at' => null]);
        $user = User::factory()->create();

        $this->spa()->actingAs($user)->postJson("/initiatives/{$initiative->id}/join")->assertCreated();
    }

    public function test_leaving_frees_the_spot_and_rejoining_works(): void
    {
        Notification::fake();
        $initiative = $this->makeInitiative(['capacity' => 1]);
        $user = User::factory()->create();

        $this->spa()->actingAs($user)->postJson("/initiatives/{$initiative->id}/join")->assertCreated();
        $this->spa()->actingAs($user)->deleteJson("/initiatives/{$initiative->id}/join")
            ->assertOk()->assertJsonPath('status', 'cancelled');

        $this->getJson("/initiatives/{$initiative->id}")->assertJsonPath('data.participants', 0);

        $this->spa()->actingAs($user)->postJson("/initiatives/{$initiative->id}/join")->assertCreated();
        $this->assertSame(1, Participation::count());
        $this->assertSame('confirmed', Participation::first()->status);
    }

    public function test_cancel_link_from_the_email_works_without_login(): void
    {
        $initiative = $this->makeInitiative();
        $participation = $this->confirmedParticipation($initiative);
        $url = URL::temporarySignedRoute('participation.cancel', now()->addDay(), ['participation' => $participation->id]);

        $this->get($url)->assertRedirect($this->frontUrl("/inicijative/{$initiative->id}?prijava=otkazana"));

        $this->assertSame('cancelled', $participation->fresh()->status);
    }

    public function test_confirmation_mail_carries_calendar_file_for_timed_initiatives_only(): void
    {
        $timed = $this->makeInitiative(['bring' => 'Rukavice', 'contact' => 'organizator@example.com']);
        $permanent = $this->makeInitiative(['kind' => 'permanent', 'starts_at' => null, 'ends_at' => null]);
        $user = User::factory()->create(['name' => 'Ana']);

        $mail = (new ParticipationConfirmed($this->confirmedParticipation($timed, $user)->load('initiative')))->toMail($user);
        $this->assertCount(1, $mail->rawAttachments);
        $this->assertSame('inicijativa.ics', $mail->rawAttachments[0]['name']);
        $this->assertStringContainsString('BEGIN:VEVENT', $mail->rawAttachments[0]['data']);

        $mail = (new ParticipationConfirmed($this->confirmedParticipation($permanent, $user)->load('initiative')))->toMail($user);
        $this->assertCount(0, $mail->rawAttachments);
    }
}
