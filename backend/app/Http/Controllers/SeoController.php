<?php

namespace App\Http\Controllers;

use App\Models\Initiative;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Throwable;

/**
 * Meta podaci za deljenje i pretragu. Front je statička aplikacija, pa botovi (Facebook, Viber, WhatsApp, Google...)
 * koji ne izvršavaju JavaScript vide samo opšti index.html. Zato .htaccess njima (po User-Agent-u) šalje zahtev ovamo:
 * vraćamo isti index.html, samo sa naslovom, opisom i slikom konkretne strane ili akcije.
 * Obični posetioci ovo ne vide; njima front sam postavlja iste podatke.
 */
class SeoController extends Controller
{
    private const DEFAULT_IMAGE = '/og-default.png';

    /** Isti spisak kao frontend/src/lib/seo.ts. */
    private const PAGES = [
        '/' => [
            'Lepša Srbija – akcije u tvom gradu',
            'Pokreni akciju u svom kraju ili se priključi komšijama: čišćenje, sadnja, uređenje, pomoć starijima.',
        ],
        '/inicijative' => [
            'Sve akcije u tvom gradu | Lepša Srbija',
            'Pronađi akciju u svom gradu i prijavi se: čišćenje, sadnja, uređenje prostora, pomoć komšijama. Za prijavu su dovoljni ime i mejl.',
        ],
        '/realizovano' => [
            'Realizovano: šta je urađeno kad se složimo | Lepša Srbija',
            'Završene akcije komšija širom Srbije, sa rezultatima i brojem volontera. Pogledaj šta je urađeno i pokreni sledeću u svom kraju.',
        ],
        '/nova-inicijativa' => [
            'Pokreni akciju u svom kraju | Lepša Srbija',
            'Opiši akciju, označi mesto na mapi i odredi vreme. Komšije iz tvog grada se prijavljuju, a ti znaš koliko ih dolazi.',
        ],
        '/o-projektu' => [
            'O projektu | Lepša Srbija',
            'Lepša Srbija okuplja ljude oko akcija u njihovom kraju. Ovde se ne skuplja novac: sajt služi samo da se zna šta se radi, gde, kada i koliko ljudi dolazi.',
        ],
        '/prijava' => [
            'Prijava i registracija | Lepša Srbija',
            'Prijavi se ili napravi nalog da pokreneš akciju u svom gradu. Za prijavu na tuđu akciju nalog ti ne treba.',
        ],
        '/privatnost' => [
            'Politika privatnosti | Lepša Srbija',
            'Koje podatke čuvamo, zašto, ko ih vidi i kako možeš da ih izbrišeš.',
        ],
        '/uslovi' => [
            'Uslovi korišćenja | Lepša Srbija',
            'Pravila korišćenja platforme Lepša Srbija za organizatore i volontere.',
        ],
    ];

    public function __invoke(Request $request): Response
    {
        $path = '/'.trim((string) parse_url((string) $request->query('path', '/'), PHP_URL_PATH), '/');
        $site = rtrim((string) config('app.url'), '/');
        $status = 200;

        [$title, $description] = self::PAGES[$path] ?? self::PAGES['/'];
        $image = $site.self::DEFAULT_IMAGE;
        $defaultImage = true;

        if (preg_match('#^/inicijative/([0-9A-Za-z]{26})$#', $path, $m)) {
            $initiative = Initiative::query()->with(['city:id,slug,name', 'organizer:id,name'])->find($m[1]);

            if ($initiative && ! $initiative->isHidden()) {
                $title = $initiative->title.' – '.$initiative->city->name.' | Lepša Srbija';
                $description = $this->describe($initiative);
                $photo = $initiative->image_path ?? $initiative->result_after_path;
                if ($photo) {
                    $image = $site.'/uploads/'.$photo;
                    $defaultImage = false;
                }
            } else {
                $status = 404;
            }
        }

        $url = $site.($path === '/' ? '/' : $path);
        $html = $this->inject($this->shell($site), $this->block($title, $description, $url, $image, $defaultImage));

        return response($html, $status)
            ->header('Content-Type', 'text/html; charset=UTF-8')
            ->header('Cache-Control', 'public, max-age=300');
    }

    /** Kada i gde, pa početak opisa; do oko 155 znakova. */
    private function describe(Initiative $i): string
    {
        $when = $i->kind === 'permanent'
            ? 'Trajna akcija'
            : $i->starts_at?->timezone('Europe/Belgrade')->format('d.m.Y. H:i');
        $lead = collect([$when, $i->city->name.', '.$i->address])->filter()->implode(' · ');
        $body = trim((string) preg_replace('/\s+/u', ' ', $i->result_published_at && $i->result_text ? $i->result_text : $i->description));

        return Str::limit($lead.'. '.$body, 155, '…', true);
    }

    private function block(string $title, string $description, string $url, string $image, bool $defaultImage): string
    {
        $t = e($title);
        $d = e($description);
        $u = e($url);
        $i = e($image);
        $size = $defaultImage
            ? '<meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" />'
            : '';

        return <<<HTML
<!--seo-->
<title>{$t}</title>
<meta name="description" content="{$d}" />
<link rel="canonical" href="{$u}" />
<meta property="og:site_name" content="Lepša Srbija" />
<meta property="og:locale" content="sr_RS" />
<meta property="og:type" content="website" />
<meta property="og:url" content="{$u}" />
<meta property="og:title" content="{$t}" />
<meta property="og:description" content="{$d}" />
<meta property="og:image" content="{$i}" />
{$size}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{$t}" />
<meta name="twitter:description" content="{$d}" />
<meta name="twitter:image" content="{$i}" />
<!--/seo-->
HTML;
    }

    private function inject(string $html, string $block): string
    {
        $replaced = preg_replace_callback('/<!--seo-->.*?<!--\/seo-->/s', fn () => $block, $html, 1, $count);

        if ($count === 1) {
            return (string) $replaced;
        }

        return (string) preg_replace_callback('/<\/head>/i', fn () => $block.'</head>', $html, 1);
    }

    /** index.html sa fronta: sa diska (public_html), a ako ga tamo nema, preko HTTP-a. */
    private function shell(string $site): string
    {
        $file = (string) config('app.frontend_index');

        if ($file !== '' && is_readable($file)) {
            return (string) file_get_contents($file);
        }

        try {
            $response = Http::timeout(5)->withUserAgent('LepsaSrbijaSeo/1.0')->get($site.'/index.html');
            if ($response->ok() && str_contains($response->body(), '</head>')) {
                return $response->body();
            }
        } catch (Throwable) {
            // ispod: minimalna strana
        }

        return '<!doctype html><html lang="sr"><head><meta charset="UTF-8" /></head><body><div id="root"></div></body></html>';
    }
}
