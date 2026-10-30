<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Samo šifarnici. Namerno nema test korisnika: ovo se pokreće i na produkciji.
     */
    public function run(): void
    {
        $this->call(ReferenceDataSeeder::class);
    }
}
