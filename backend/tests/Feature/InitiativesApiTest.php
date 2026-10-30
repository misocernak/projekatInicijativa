<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\City;
use App\Models\Initiative;
use App\Models\Participation;
use App\Models\User;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InitiativesApiTest extends TestCase
{
    use RefreshDatabase;

    /** Pravi inicijativu sa razumnim podrazumevanim vrednostima. */
    private function makeInitiative(array $attrs = []): Initiative
    {
        $city = City::firstOrCreate(['slug' => 'nis'], ['name' => 'Niš', 'lat' => 43.32, 'lng' => 21.89]);
        $category = Category::firstOrCreate(['slug' => 'ciscenje'], ['name' => 'Čišćenje']);

        return Initiative::create(array_merge([
            'user_id' => User::factory()->create()->id,
            'city_id' => $city->id,
            'category_id' => $category->id,
            'title' => 'Test inicijativa',
            'description' => 'Opis inicijative',
            'address' => 'Ulica 1',
            'lat' => 43.32,
            'lng' => 21.89,
            'kind' => 'timed',
            'starts_at' => now()->addDays(3),
            'ends_at' => now()->addDays(3)->addHours(2),
        ], $attrs));
    }

    public function test_health_reports_ok_and_database(): void
    {
        $this->getJson('/health')->assertOk()->assertJson(['status' => 'ok', 'database' => true]);
    }

    public function test_reference_data_has_the_shape_the_frontend_expects(): void
    {
        $this->seed(ReferenceDataSeeder::class);

        $this->getJson('/cities')->assertOk()
            ->assertJsonCount(10)
            ->assertJsonFragment(['id' => 'beograd', 'name' => 'Beograd']);

        $this->getJson('/categories')->assertOk()
            ->assertJsonCount(7)
            ->assertJsonFragment(['id' => 'ciscenje', 'label' => 'Čišćenje']);
    }

    public function test_seeder_is_idempotent(): void
    {
        $this->seed(ReferenceDataSeeder::class);
        $this->seed(ReferenceDataSeeder::class);

        $this->assertSame(10, City::count());
        $this->assertSame(7, Category::count());
    }

    public function test_list_returns_frontend_shaped_initiatives(): void
    {
        $this->makeInitiative(['capacity' => 10, 'bring' => 'Rukavice']);

        $this->getJson('/initiatives')->assertOk()
            ->assertJsonPath('data.0.title', 'Test inicijativa')
            ->assertJsonPath('data.0.cityId', 'nis')
            ->assertJsonPath('data.0.category', 'ciscenje')
            ->assertJsonPath('data.0.kind', 'timed')
            ->assertJsonPath('data.0.capacity', 10)
            ->assertJsonPath('data.0.participants', 0)
            ->assertJsonPath('data.0.cancelled', false)
            ->assertJsonMissingPath('data.0.contact')
            ->assertJsonMissingPath('data.0.image');
    }

    public function test_participants_counts_only_confirmed(): void
    {
        $i = $this->makeInitiative();
        Participation::create(['initiative_id' => $i->id, 'user_id' => User::factory()->create()->id, 'status' => 'confirmed']);
        Participation::create(['initiative_id' => $i->id, 'user_id' => User::factory()->create()->id, 'status' => 'pending']);
        Participation::create(['initiative_id' => $i->id, 'user_id' => User::factory()->create()->id, 'status' => 'cancelled']);

        $this->getJson("/initiatives/{$i->id}")->assertOk()->assertJsonPath('data.participants', 1);
    }

    public function test_filters_by_city_and_category(): void
    {
        $this->makeInitiative(['title' => 'Niš čišćenje']);
        $bg = City::create(['slug' => 'beograd', 'name' => 'Beograd', 'lat' => 44.8, 'lng' => 20.4]);
        $green = Category::create(['slug' => 'zelenilo', 'name' => 'Zelenilo']);
        $this->makeInitiative(['title' => 'Beograd zelenilo', 'city_id' => $bg->id, 'category_id' => $green->id]);

        $this->getJson('/initiatives?city=beograd')->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Beograd zelenilo');
        $this->getJson('/initiatives?category=ciscenje')->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.title', 'Niš čišćenje');
    }

    public function test_filters_by_status(): void
    {
        $this->makeInitiative(['title' => 'Predstoji']);
        $this->makeInitiative(['title' => 'Završena', 'starts_at' => now()->subDays(5), 'ends_at' => now()->subDays(5)->addHours(2)]);
        $this->makeInitiative(['title' => 'U toku', 'starts_at' => now()->subHour(), 'ends_at' => now()->addHour()]);
        $this->makeInitiative(['title' => 'Trajna', 'kind' => 'permanent', 'starts_at' => null, 'ends_at' => null]);
        $this->makeInitiative(['title' => 'Otkazana', 'cancelled_at' => now()]);

        $expected = [
            'upcoming' => 'Predstoji',
            'finished' => 'Završena',
            'ongoing' => 'U toku',
            'permanent' => 'Trajna',
            'cancelled' => 'Otkazana',
        ];

        foreach ($expected as $status => $title) {
            $this->getJson("/initiatives?status={$status}")->assertOk()
                ->assertJsonCount(1, 'data')
                ->assertJsonPath('data.0.title', $title);
        }
    }

    public function test_permanent_initiatives_come_last(): void
    {
        $this->makeInitiative(['title' => 'Trajna', 'kind' => 'permanent', 'starts_at' => null, 'ends_at' => null]);
        $this->makeInitiative(['title' => 'Vremenska']);

        $this->getJson('/initiatives')->assertOk()
            ->assertJsonPath('data.0.title', 'Vremenska')
            ->assertJsonPath('data.1.title', 'Trajna');
    }

    public function test_search_matches_title_and_escapes_wildcards(): void
    {
        $this->makeInitiative(['title' => 'Sadnja drveća']);
        $this->makeInitiative(['title' => 'Mural']);

        $this->getJson('/initiatives?q=drve')->assertOk()->assertJsonCount(1, 'data');
        // "%" se tretira kao običan znak, ne kao džoker
        $this->getJson('/initiatives?q=%25')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_invalid_status_is_rejected(): void
    {
        $this->getJson('/initiatives?status=nesto')->assertStatus(422);
    }

    public function test_show_returns_initiative_or_404(): void
    {
        $i = $this->makeInitiative();

        $this->getJson("/initiatives/{$i->id}")->assertOk()->assertJsonPath('data.id', $i->id);
        $this->getJson('/initiatives/nepostojeci-id')->assertNotFound();
    }
}
