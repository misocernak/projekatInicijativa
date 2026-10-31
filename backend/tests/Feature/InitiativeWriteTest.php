<?php

namespace Tests\Feature;

use App\Models\Initiative;
use App\Models\User;
use App\Notifications\InitiativeCancelled;
use App\Notifications\InitiativeUpdated;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\MakesInitiatives;
use Tests\TestCase;

class InitiativeWriteTest extends TestCase
{
    use MakesInitiatives;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(ReferenceDataSeeder::class);
    }

    public function test_guest_cannot_create(): void
    {
        $this->spa()->postJson('/initiatives', $this->payload())->assertUnauthorized();
    }

    public function test_unverified_user_cannot_create(): void
    {
        $user = User::factory()->unverified()->create();

        $this->spa()->actingAs($user)->postJson('/initiatives', $this->payload())->assertForbidden();
        $this->assertSame(0, Initiative::count());
    }

    public function test_verified_user_creates_initiative(): void
    {
        $user = User::factory()->create(['name' => 'Jelena']);

        $this->spa()->actingAs($user)->postJson('/initiatives', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.title', 'Čišćenje parka')
            ->assertJsonPath('data.cityId', 'nis')
            ->assertJsonPath('data.category', 'ciscenje')
            ->assertJsonPath('data.organizerName', 'Jelena')
            ->assertJsonPath('data.organizerId', (string) $user->id)
            ->assertJsonPath('data.capacity', 10)
            ->assertJsonPath('data.participants', 0)
            ->assertJsonPath('data.viewer.isOrganizer', true);

        $this->assertDatabaseHas('initiatives', ['user_id' => $user->id, 'title' => 'Čišćenje parka']);
    }

    public function test_permanent_initiative_needs_no_dates(): void
    {
        $user = User::factory()->create();

        $this->spa()->actingAs($user)->postJson('/initiatives', $this->payload([
            'kind' => 'permanent',
            'startDate' => null,
            'endDate' => null,
        ]))
            ->assertCreated()
            ->assertJsonPath('data.kind', 'permanent')
            ->assertJsonMissingPath('data.startDate');
    }

    public function test_create_validates_input(): void
    {
        $user = User::factory()->create();
        $this->spa()->actingAs($user);

        $this->postJson('/initiatives', $this->payload([
            'startDate' => now()->addDays(5)->toIso8601String(),
            'endDate' => now()->addDays(4)->toIso8601String(),
        ]))->assertStatus(422)->assertJsonValidationErrors(['endDate']);

        $this->postJson('/initiatives', $this->payload(['startDate' => null, 'endDate' => null]))
            ->assertStatus(422)->assertJsonValidationErrors(['startDate', 'endDate']);

        $this->postJson('/initiatives', $this->payload([
            'startDate' => now()->subDays(3)->toIso8601String(),
            'endDate' => now()->subDays(3)->addHours(2)->toIso8601String(),
        ]))->assertStatus(422)->assertJsonValidationErrors(['startDate']);

        $this->postJson('/initiatives', $this->payload(['category' => 'nepostoji']))
            ->assertStatus(422)->assertJsonValidationErrors(['category']);
        $this->postJson('/initiatives', $this->payload(['cityId' => 'nepostoji']))
            ->assertStatus(422)->assertJsonValidationErrors(['cityId']);
        $this->postJson('/initiatives', $this->payload(['lat' => 120]))
            ->assertStatus(422)->assertJsonValidationErrors(['lat']);
        $this->postJson('/initiatives', $this->payload(['capacity' => 0]))
            ->assertStatus(422)->assertJsonValidationErrors(['capacity']);
        $this->postJson('/initiatives', $this->payload(['title' => '']))
            ->assertStatus(422)->assertJsonValidationErrors(['title']);

        $this->assertSame(0, Initiative::count());
    }

    public function test_create_with_image_stores_it_and_exposes_url(): void
    {
        Storage::fake('uploads');
        $user = User::factory()->create();

        $response = $this->spa()->actingAs($user)->post(
            '/initiatives',
            $this->payload(['image' => UploadedFile::fake()->image('foto.jpg', 1200, 800)]),
            ['Accept' => 'application/json'],
        );

        $response->assertCreated();
        $this->assertStringContainsString('/uploads/initiatives/', $response->json('data.image'));

        $path = Initiative::firstOrFail()->image_path;
        // slika se čuva kao WebP (ili JPEG ako GD na serveru nema WebP)
        $this->assertStringEndsWith(function_exists('imagewebp') ? '.webp' : '.jpg', $path);
        $this->assertNotNull($path);
        Storage::disk('uploads')->assertExists($path);
    }

    public function test_non_image_upload_is_rejected(): void
    {
        Storage::fake('uploads');
        $user = User::factory()->create();

        $this->spa()->actingAs($user)->post(
            '/initiatives',
            $this->payload(['image' => UploadedFile::fake()->create('dokument.pdf', 20, 'application/pdf')]),
            ['Accept' => 'application/json'],
        )->assertStatus(422)->assertJsonValidationErrors(['image']);

        $this->assertSame(0, Initiative::count());
    }

    public function test_owner_updates_and_confirmed_participants_hear_about_new_time(): void
    {
        Notification::fake();
        $owner = User::factory()->create();
        $initiative = $this->makeInitiative(['user_id' => $owner->id]);
        $volunteer = User::factory()->create();
        $waiting = User::factory()->create();
        $this->confirmedParticipation($initiative, $volunteer);
        $this->pendingParticipation($initiative, $waiting);

        $this->spa()->actingAs($owner)->putJson("/initiatives/{$initiative->id}", $this->payload([
            'title' => 'Novi naslov',
            'startDate' => now()->addDays(9)->toIso8601String(),
            'endDate' => now()->addDays(9)->addHours(2)->toIso8601String(),
        ]))->assertOk()->assertJsonPath('data.title', 'Novi naslov');

        Notification::assertSentTo($volunteer, InitiativeUpdated::class);
        Notification::assertNotSentTo($waiting, InitiativeUpdated::class);
    }

    public function test_changing_only_the_title_does_not_notify_anyone(): void
    {
        Notification::fake();
        $owner = User::factory()->create();
        $initiative = $this->makeInitiative(['user_id' => $owner->id]);
        $this->confirmedParticipation($initiative);

        $this->spa()->actingAs($owner)->putJson("/initiatives/{$initiative->id}", $this->payload([
            'title' => 'Samo drugi naslov',
            'address' => $initiative->address,
            'lat' => $initiative->lat,
            'lng' => $initiative->lng,
            'startDate' => $initiative->starts_at->toIso8601String(),
            'endDate' => $initiative->ends_at->toIso8601String(),
        ]))->assertOk();

        Notification::assertNothingSent();
    }

    public function test_other_users_cannot_update_or_cancel(): void
    {
        $initiative = $this->makeInitiative();
        $stranger = User::factory()->create();

        $this->spa()->actingAs($stranger)->putJson("/initiatives/{$initiative->id}", $this->payload())->assertForbidden();
        $this->spa()->actingAs($stranger)->postJson("/initiatives/{$initiative->id}/cancel")->assertForbidden();
        $this->assertNull($initiative->fresh()->cancelled_at);
    }

    public function test_cancel_notifies_confirmed_participants_once(): void
    {
        Notification::fake();
        $owner = User::factory()->create();
        $initiative = $this->makeInitiative(['user_id' => $owner->id]);
        $volunteer = User::factory()->create();
        $this->confirmedParticipation($initiative, $volunteer);

        $this->spa()->actingAs($owner)->postJson("/initiatives/{$initiative->id}/cancel")
            ->assertOk()->assertJsonPath('data.cancelled', true);
        $this->spa()->actingAs($owner)->postJson("/initiatives/{$initiative->id}/cancel")->assertOk();

        Notification::assertSentTo($volunteer, InitiativeCancelled::class);
        Notification::assertCount(1);
    }

    public function test_cancelled_initiative_cannot_be_edited(): void
    {
        $owner = User::factory()->create();
        $initiative = $this->makeInitiative(['user_id' => $owner->id, 'cancelled_at' => now()]);

        $this->spa()->actingAs($owner)->putJson("/initiatives/{$initiative->id}", $this->payload())->assertStatus(422);
    }

    public function test_image_can_be_replaced_and_removed_by_the_owner_only(): void
    {
        Storage::fake('uploads');
        $owner = User::factory()->create();
        $initiative = $this->makeInitiative(['user_id' => $owner->id]);

        $this->spa()->actingAs($owner)->post(
            "/initiatives/{$initiative->id}/image",
            ['image' => UploadedFile::fake()->image('a.jpg', 800, 600)],
            ['Accept' => 'application/json'],
        )->assertOk();

        $first = $initiative->fresh()->image_path;
        $this->assertNotNull($first);
        Storage::disk('uploads')->assertExists($first);

        $this->spa()->actingAs($owner)->post(
            "/initiatives/{$initiative->id}/image",
            ['image' => UploadedFile::fake()->image('b.jpg', 800, 600)],
            ['Accept' => 'application/json'],
        )->assertOk();

        $second = $initiative->fresh()->image_path;
        $this->assertNotSame($first, $second);
        Storage::disk('uploads')->assertMissing($first);
        Storage::disk('uploads')->assertExists($second);

        $stranger = User::factory()->create();
        $this->spa()->actingAs($stranger)->deleteJson("/initiatives/{$initiative->id}/image")->assertForbidden();

        $this->spa()->actingAs($owner)->deleteJson("/initiatives/{$initiative->id}/image")
            ->assertOk()->assertJsonMissingPath('data.image');
        Storage::disk('uploads')->assertMissing($second);
    }

    public function test_my_initiatives_and_participations(): void
    {
        $organizer = User::factory()->create();
        $volunteer = User::factory()->create();
        $mine = $this->makeInitiative(['user_id' => $organizer->id, 'title' => 'Moja']);
        $this->makeInitiative(['title' => 'Tuđa']);
        $this->confirmedParticipation($mine, $volunteer);

        $this->spa()->actingAs($organizer)->getJson('/me/initiatives')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.title', 'Moja');

        $this->spa()->actingAs($volunteer)->getJson('/me/participations')
            ->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Moja')
            ->assertJsonPath('data.0.viewer.participation', 'confirmed');

        $this->spa()->actingAs($organizer)->getJson('/me/participations')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_participant_list_is_for_the_organizer_only(): void
    {
        $owner = User::factory()->create();
        $initiative = $this->makeInitiative(['user_id' => $owner->id]);
        $this->confirmedParticipation($initiative, User::factory()->create(['name' => 'Pera Perić']));

        $this->spa()->actingAs($owner)->getJson("/initiatives/{$initiative->id}/participants")
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Pera Perić')
            ->assertJsonMissingPath('data.0.email');

        $this->spa()->actingAs(User::factory()->create())->getJson("/initiatives/{$initiative->id}/participants")->assertForbidden();
    }

    public function test_participant_list_requires_login(): void
    {
        $initiative = $this->makeInitiative();

        $this->getJson("/initiatives/{$initiative->id}/participants")->assertUnauthorized();
        $this->getJson('/me/initiatives')->assertUnauthorized();
    }

    public function test_viewer_info_is_only_shown_to_logged_in_users(): void
    {
        $initiative = $this->makeInitiative();
        $volunteer = User::factory()->create();
        $this->confirmedParticipation($initiative, $volunteer);

        $this->getJson("/initiatives/{$initiative->id}")->assertOk()->assertJsonMissingPath('data.viewer');

        $this->spa()->actingAs($volunteer)->getJson("/initiatives/{$initiative->id}")
            ->assertOk()
            ->assertJsonPath('data.viewer.isOrganizer', false)
            ->assertJsonPath('data.viewer.participation', 'confirmed');
    }
}
