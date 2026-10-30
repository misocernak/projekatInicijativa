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

    /** Pravi akciju sa razumnim podrazumevanim vrednostima. */
    private function makeInitiative(array $attrs = []): Initiative
    {
        $city = City::firstOrCreate(['slug' => 'nis'], ['name' => 'Niš', 'lat' => 43.32, 'lng' => 21.89]);
        $category = Category::firstOrCreate(['slug' => 'ciscenje'], ['name' => 'Čišćenje']);

        return Initiative::create(array_merge([
            'user_id' => User::factory()->create()->id,
            'city_id' => $city->id,
            'category_id' => $category->id,
            'title' => 'Test akcija',
            'description' => 'Opis akcije',
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
            ->assertJsonCount($this->citiesInFile())
            ->assertJsonFragment(['id' => 'beograd', 'name' => 'Beograd', 'group' => 'Beograd — gradske opštine'])
            ->assertJsonFragment(['id' => 'cacak', 'name' => 'Čačak', 'group' => 'Ostali gradovi i opštine']);

        $this->getJson('/categories')->assertOk()
            ->assertJsonCount(7)
            ->assertJsonFragment(['id' => 'ciscenje', 'label' => 'Čišćenje']);
    }

    public function test_seeder_is_idempotent(): void
    {
        $this->seed(ReferenceDataSeeder::class);
        $this->seed(ReferenceDataSeeder::class);

        $this->assertSame($this->citiesInFile(), City::count());
        $this->assertSame(7, Category::count());
    }

    private function citiesInFile(): int
    {
        return count(json_decode((string) file_get_contents(database_path('data/cities.json')), true));
    }

    /** Front ima svoju kopiju liste (frontend/src/data/cities.ts); ne sme da se razilazi sa bazom. */
    public function test_frontend_city_list_matches_the_backend_list(): void
    {
        $json = json_decode((string) file_get_contents(database_path('data/cities.json')), true);
        $ts = (string) file_get_contents(base_path('../frontend/src/data/cities.ts'));

        preg_match_all('/\{ id: "([^"]+)", name: "([^"]+)", group: "([^"]+)", lat: ([0-9.]+), lng: ([0-9.]+) \}/u', $ts, $m, PREG_SET_ORDER);

        $this->assertCount(count($json), $m, 'Front i backend nemaju isti broj gradova.');

        foreach ($json as $i => $city) {
            $this->assertSame($city['id'], $m[$i][1]);
            $this->assertSame($city['name'], $m[$i][2]);
            $this->assertSame($city['group'], $m[$i][3]);
            $this->assertEqualsWithDelta($city['lat'], (float) $m[$i][4], 0.00001);
            $this->assertEqualsWithDelta($city['lng'], (float) $m[$i][5], 0.00001);
        }
    }

    public function test_city_list_is_unique_and_sorted_into_the_two_groups(): void
    {
        $json = json_decode((string) file_get_contents(database_path('data/cities.json')), true);

        $slugs = array_column($json, 'id');
        $this->assertSame($slugs, array_values(array_unique($slugs)));

        $groups = array_values(array_unique(array_column($json, 'group')));
        $this->assertSame(['Beograd — gradske opštine', 'Ostali gradovi i opštine'], $groups);

        // gradovi koji već postoje u produkciji moraju zadržati iste slug-ove
        foreach (['beograd', 'novi-sad', 'nis', 'kragujevac', 'subotica', 'cacak', 'kraljevo', 'pancevo', 'zrenjanin', 'uzice'] as $old) {
            $this->assertContains($old, $slugs);
        }

        foreach ($json as $city) {
            $this->assertEqualsWithDelta(44.0, $city['lat'], 2.5, $city['name']);
            $this->assertEqualsWithDelta(20.8, $city['lng'], 2.5, $city['name']);
        }
    }

    public function test_list_returns_frontend_shaped_initiatives(): void
    {
        $this->makeInitiative(['capacity' => 10, 'bring' => 'Rukavice']);

        $this->getJson('/initiatives')->assertOk()
            ->assertJsonPath('data.0.title', 'Test akcija')
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
