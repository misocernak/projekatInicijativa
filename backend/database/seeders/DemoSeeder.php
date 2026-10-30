<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\City;
use App\Models\Initiative;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

/**
 * Primeri akcija da sajt ne bude prazan pre prvih pravih objava.
 * NE pokreće se automatski. Na serveru:  php artisan db:seed --class=DemoSeeder --force
 *
 * Idempotentno: svaki put ponovo pravi primere sa svežim datumima. Sve pripada jednom "demo" nalogu,
 * pa se uklanja brisanjem tog naloga (akcije se brišu kaskadno):
 *   php artisan tinker --execute="App\Models\User::where('email','demo@lepsasrbija.com')->delete();"
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(ReferenceDataSeeder::class);

        $organizer = User::firstOrCreate(
            ['email' => 'demo@lepsasrbija.com'],
            ['name' => 'Lepša Srbija tim', 'password' => Str::random(40)],
        );
        $organizer->forceFill(['email_verified_at' => now()])->save();
        $organizer->initiatives()->delete();

        foreach ($this->samples() as $s) {
            Initiative::create([
                'user_id' => $organizer->id,
                'city_id' => City::where('slug', $s['city'])->value('id'),
                'category_id' => Category::where('slug', $s['category'])->value('id'),
                'title' => $s['title'],
                'description' => $s['description'],
                'address' => $s['address'],
                'lat' => $s['lat'],
                'lng' => $s['lng'],
                'kind' => isset($s['in']) ? 'timed' : 'permanent',
                'starts_at' => isset($s['in']) ? $this->at($s['in'], $s['hour'], 0) : null,
                'ends_at' => isset($s['in']) ? $this->at($s['in'], $s['hour'], $s['hours']) : null,
                'capacity' => $s['capacity'] ?? null,
                'bring' => $s['bring'] ?? null,
            ]);
        }
    }

    /** Datum u lokalnom vremenu (Beograd), sačuvan kao UTC. */
    private function at(int $daysFromNow, int $hour, int $plusHours): \Illuminate\Support\Carbon
    {
        return now('Europe/Belgrade')->addDays($daysFromNow)->setTime($hour, 0)->addHours($plusHours)->utc();
    }

    /** @return list<array<string, mixed>> */
    private function samples(): array
    {
        return [
            [
                'title' => 'Veliko proleće u Tašmajdanu: čišćenje staza i klupa',
                'description' => "Okupljamo se da očistimo staze, ofarbamo klupe i prikupimo otpad oko dečjeg igrališta.\n\nNije potrebno nikakvo iskustvo. Podelićemo se u male ekipe, a za kraj sledi zajednička pauza uz čaj i kolače.",
                'category' => 'ciscenje', 'city' => 'beograd', 'address' => 'Park Tašmajdan, ulaz kod crkve Svetog Marka',
                'lat' => 44.8105, 'lng' => 20.4747, 'in' => 6, 'hour' => 10, 'hours' => 4, 'capacity' => 40,
                'bring' => 'Radne rukavice, voda, udobna obuća. Kese i alat obezbeđujemo mi.',
            ],
            [
                'title' => 'Sadnja drveća u novom kvartu Liman',
                'description' => "Sadimo 30 sadnica lipe i javora duž glavne ulice. Sadnice su obezbeđene od strane mesne zajednice.\n\nTražimo ljude koji mogu da kopaju, da zalivaju i da pomognu oko organizacije.",
                'category' => 'zelenilo', 'city' => 'novi-sad', 'address' => 'Bulevar Evrope, kod pijace',
                'lat' => 45.2432, 'lng' => 19.8449, 'in' => 12, 'hour' => 9, 'hours' => 5, 'capacity' => 25,
                'bring' => 'Lopata ako imate, rukavice, voda.',
            ],
            [
                'title' => 'Farbanje ograde i klupa u dvorištu zgrade',
                'description' => 'Komšije iz ulice Cara Dušana farbaju ogradu i klupe u zajedničkom dvorištu. Boju i četke obezbeđuje stanarska zajednica.',
                'category' => 'uredjenje', 'city' => 'nis', 'address' => 'Ulica Cara Dušana 14',
                'lat' => 43.3236, 'lng' => 21.8987, 'in' => 3, 'hour' => 16, 'hours' => 3, 'capacity' => 12,
                'bring' => 'Stara odeća koja sme da se zaprlja.',
            ],
            [
                'title' => 'Obnova dečjeg igrališta u Aerodromu',
                'description' => 'Popravljamo ljuljaške, farbamo sprave i menjamo pesak u peskovniku. Potrebni su i majstori i oni koji samo žele da pomognu.',
                'category' => 'igraliste', 'city' => 'kragujevac', 'address' => 'Naselje Aerodrom, kod OŠ „Sveti Sava“',
                'lat' => 44.0227, 'lng' => 20.9283, 'in' => 9, 'hour' => 9, 'hours' => 8, 'capacity' => 30,
                'bring' => 'Alat ako imate, radna odeća.',
            ],
            [
                'title' => 'Mural na zidu podvožnjaka',
                'description' => 'Crtamo zajednički mural na sivom zidu podvožnjaka. Dizajn je izabran na javnom pozivu. Treba nam pomoć oko pripreme zida i bojenja.',
                'category' => 'kultura', 'city' => 'cacak', 'address' => 'Podvožnjak kod železničke stanice',
                'lat' => 43.8912, 'lng' => 20.3511, 'in' => 20, 'hour' => 10, 'hours' => 6, 'capacity' => 30,
                'bring' => 'Stara odeća. Boje i četke obezbeđujemo.',
            ],
            [
                'title' => 'Nedeljno druženje sa starijim komšijama',
                'description' => 'Svake nedelje posećujemo starije sugrađane, pomažemo oko nabavke i šetamo sa njima. Priključiti se možete u bilo kom trenutku.',
                'category' => 'pomoc', 'city' => 'beograd', 'address' => 'Dom zdravlja Zvezdara, okupljanje ispred ulaza',
                'lat' => 44.8007, 'lng' => 20.5034, 'bring' => 'Dobro raspoloženje.',
            ],
            [
                'title' => 'Hranjenje i briga o napuštenim mačkama',
                'description' => 'Održavamo hranilišta za mačke u parku i dežuramo po rasporedu. Treba nam još ljudi za jutarnju i večernju smenu.',
                'category' => 'zivotinje', 'city' => 'subotica', 'address' => 'Gradski park, kod fontane',
                'lat' => 46.0996, 'lng' => 19.6628, 'capacity' => 20,
            ],
        ];
    }
}
