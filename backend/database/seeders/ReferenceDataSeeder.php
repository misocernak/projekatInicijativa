<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\City;
use Illuminate\Database\Seeder;

/**
 * Šifarnici (gradovi, kategorije). Idempotentno: bezbedno je pokretati pri svakom deploy-u.
 * Slug-ovi moraju odgovarati onima na frontu (frontend/src/data/constants.ts).
 */
class ReferenceDataSeeder extends Seeder
{
    public function run(): void
    {
        $cities = [
            ['beograd', 'Beograd', 44.8125, 20.4612],
            ['novi-sad', 'Novi Sad', 45.2671, 19.8335],
            ['nis', 'Niš', 43.3209, 21.8958],
            ['kragujevac', 'Kragujevac', 44.0128, 20.9114],
            ['subotica', 'Subotica', 46.1, 19.6667],
            ['cacak', 'Čačak', 43.8914, 20.3497],
            ['kraljevo', 'Kraljevo', 43.7258, 20.6894],
            ['pancevo', 'Pančevo', 44.8708, 20.6403],
            ['zrenjanin', 'Zrenjanin', 45.3816, 20.3903],
            ['uzice', 'Užice', 43.8556, 19.8425],
        ];
        foreach ($cities as [$slug, $name, $lat, $lng]) {
            City::updateOrCreate(['slug' => $slug], ['name' => $name, 'lat' => $lat, 'lng' => $lng]);
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
