<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\City;
use Illuminate\Database\Seeder;

/**
 * Šifarnici (gradovi, kategorije). Idempotentno: bezbedno je pokretati pri svakom deploy-u.
 *
 * Gradovi dolaze iz database/data/cities.json: zatvorena lista gradova i opština Srbije
 * (ista kao u Temelju). Slug-ovi moraju odgovarati frontu (frontend/src/data/cities.ts),
 * što proverava test.
 */
class ReferenceDataSeeder extends Seeder
{
    public function run(): void
    {
        $cities = json_decode(
            (string) file_get_contents(database_path('data/cities.json')),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );

        foreach ($cities as $city) {
            City::updateOrCreate(
                ['slug' => $city['id']],
                ['name' => $city['name'], 'region' => $city['group'], 'lat' => $city['lat'], 'lng' => $city['lng']],
            );
        }

        $categories = [
            'ciscenje' => 'Čišćenje',
            'zelenilo' => 'Zelenilo i sadnja',
            'uredjenje' => 'Uređenje prostora',
            'igraliste' => 'Igrališta i parkovi',
            'pomoc' => 'Pomoć sugrađanima',
            'zivotinje' => 'Životinje',
            'kultura' => 'Kultura i druženje',
        ];
        foreach ($categories as $slug => $name) {
            Category::updateOrCreate(['slug' => $slug], ['name' => $name]);
        }
    }
}
