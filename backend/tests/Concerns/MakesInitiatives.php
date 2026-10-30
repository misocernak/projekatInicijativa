<?php

namespace Tests\Concerns;

use App\Models\Category;
use App\Models\City;
use App\Models\Initiative;
use App\Models\Participation;
use App\Models\User;

trait MakesInitiatives
{
    /** Zahtev stiže sa "fronta": Referer iz liste stateful domena, pa Sanctum pokreće sesiju. */
    protected function spa(): static
    {
        return $this->withHeader('Referer', 'http://localhost');
    }

    protected function makeInitiative(array $attrs = []): Initiative
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

    /** Telo zahteva za kreiranje akcije, u obliku koji šalje front. */
    protected function payload(array $override = []): array
    {
        return array_merge([
            'title' => 'Čišćenje parka',
            'description' => 'Čistimo park zajedno sa komšijama.',
            'category' => 'ciscenje',
            'cityId' => 'nis',
            'address' => 'Park kod škole',
            'lat' => 43.32,
            'lng' => 21.89,
            'kind' => 'timed',
            'startDate' => now()->addDays(5)->toIso8601String(),
            'endDate' => now()->addDays(5)->addHours(3)->toIso8601String(),
            'capacity' => 10,
            'bring' => 'Rukavice',
            'contact' => '0641234567',
        ], $override);
    }

    protected function confirmedParticipation(Initiative $initiative, ?User $user = null): Participation
    {
        return Participation::create([
            'initiative_id' => $initiative->id,
            'user_id' => ($user ?? User::factory()->create())->id,
            'status' => Participation::CONFIRMED,
            'confirmed_at' => now(),
        ]);
    }

    protected function pendingParticipation(Initiative $initiative, ?User $user = null): Participation
    {
        return Participation::create([
            'initiative_id' => $initiative->id,
            'user_id' => ($user ?? User::factory()->create())->id,
            'status' => Participation::PENDING,
        ]);
    }

    protected function frontUrl(string $path): string
    {
        return rtrim(config('app.url'), '/').$path;
    }
}
