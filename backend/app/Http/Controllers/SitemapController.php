<?php

namespace App\Http\Controllers;

use App\Models\Initiative;
use Illuminate\Http\Response;

/**
 * sitemap.xml: glavne strane i sve javne akcije, da ih pretraživači nađu i brzo uhvate nove.
 * .htaccess prosleđuje /sitemap.xml na API.
 */
class SitemapController extends Controller
{
    private const PAGES = ['/', '/inicijative', '/realizovano', '/nova-inicijativa', '/o-projektu', '/privatnost', '/uslovi'];

    public function __invoke(): Response
    {
        $site = rtrim((string) config('app.url'), '/');

        $urls = collect(self::PAGES)->map(fn (string $path) => [
            'loc' => $site.($path === '/' ? '/' : $path),
            'lastmod' => null,
        ]);

        $initiatives = Initiative::query()
            ->whereNull('hidden_at')
            ->orderByDesc('updated_at')
            ->limit(5000)
            ->get(['id', 'updated_at'])
            ->map(fn (Initiative $i) => [
                'loc' => $site.'/inicijative/'.$i->id,
                'lastmod' => $i->updated_at?->toAtomString(),
            ]);

        $xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n".'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n";
        foreach ($urls->concat($initiatives) as $u) {
            $xml .= '  <url><loc>'.e($u['loc']).'</loc>'.($u['lastmod'] ? '<lastmod>'.$u['lastmod'].'</lastmod>' : '').'</url>'."\n";
        }
        $xml .= '</urlset>'."\n";

        return response($xml, 200)
            ->header('Content-Type', 'application/xml; charset=UTF-8')
            ->header('Cache-Control', 'public, max-age=3600');
    }
}
