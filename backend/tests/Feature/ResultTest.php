<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\MakesInitiatives;
use Tests\TestCase;

class ResultTest extends TestCase
{
    use MakesInitiatives;
    use RefreshDatabase;

    private function finished(User $owner, array $attrs = [])
    {
        return $this->makeInitiative($attrs + [
            'user_id' => $owner->id,
            'starts_at' => now()->subDays(2),
            'ends_at' => now()->subDays(2)->addHours(3),
        ]);
    }

    private function body(array $extra = []): array
    {
        return $extra + [
            'text' => 'Očistili smo park i izneli dvadeset džakova smeća.',
            'after' => UploadedFile::fake()->image('posle.jpg', 1200, 800),
        ];
    }

    public function test_organizer_publishes_result_and_it_shows_in_public_list_and_stats(): void
    {
        Storage::fake('uploads');
        $owner = User::factory()->create();
        $initiative = $this->finished($owner);
        $this->confirmedParticipation($initiative);
        $this->confirmedParticipation($initiative);

        $this->spa()->actingAs($owner)->post(
            "/initiatives/{$initiative->id}/result",
            $this->body(['before' => UploadedFile::fake()->image('pre.jpg', 800, 600)]),
            ['Accept' => 'application/json'],
        )->assertOk()
            ->assertJsonPath('data.result.text', 'Očistili smo park i izneli dvadeset džakova smeća.')
            ->assertJsonStructure(['data' => ['result' => ['before', 'after', 'publishedAt']]]);

        $this->getJson('/results')
            ->assertOk()
            ->assertJsonPath('stats.actions', 1)
            ->assertJsonPath('stats.volunteers', 2)
            ->assertJsonPath('stats.cities', 1)
            ->assertJsonPath('data.0.id', $initiative->id);
    }

    public function test_after_photo_is_required_for_first_publish(): void
    {
        Storage::fake('uploads');
        $owner = User::factory()->create();
        $initiative = $this->finished($owner);

        $this->spa()->actingAs($owner)
            ->postJson("/initiatives/{$initiative->id}/result", ['text' => 'Očistili smo park i izneli dvadeset džakova.'])
            ->assertStatus(422)->assertJsonValidationErrors(['after']);
    }

    public function test_cannot_publish_before_action_ends_or_for_someone_elses_action(): void
    {
        Storage::fake('uploads');
        $owner = User::factory()->create();
        $upcoming = $this->makeInitiative(['user_id' => $owner->id]);

        $this->spa()->actingAs($owner)->post("/initiatives/{$upcoming->id}/result", $this->body(), ['Accept' => 'application/json'])
            ->assertStatus(422);

        $finished = $this->finished($owner);
        $this->spa()->actingAs(User::factory()->create())->post("/initiatives/{$finished->id}/result", $this->body(), ['Accept' => 'application/json'])
            ->assertForbidden();
        $this->assertDatabaseCount('initiatives', 2);
        $this->getJson('/results')->assertJsonPath('stats.actions', 0);
    }

    public function test_removing_result_hides_it_from_the_list(): void
    {
        Storage::fake('uploads');
        $owner = User::factory()->create();
        $initiative = $this->finished($owner);

        $this->spa()->actingAs($owner)->post("/initiatives/{$initiative->id}/result", $this->body(), ['Accept' => 'application/json'])->assertOk();
        $this->spa()->actingAs($owner)->deleteJson("/initiatives/{$initiative->id}/result")->assertOk();

        $this->getJson('/results')->assertJsonPath('stats.actions', 0)->assertJsonCount(0, 'data');
        $this->assertNull($initiative->fresh()->result_after_path);
    }

    public function test_hidden_actions_do_not_appear_in_results(): void
    {
        Storage::fake('uploads');
        $owner = User::factory()->create();
        $initiative = $this->finished($owner);
        $this->spa()->actingAs($owner)->post("/initiatives/{$initiative->id}/result", $this->body(), ['Accept' => 'application/json'])->assertOk();
        $initiative->forceFill(['hidden_at' => now()])->save();

        $this->getJson('/results')->assertJsonPath('stats.actions', 0);
    }
}
