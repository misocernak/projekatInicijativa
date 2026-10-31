<?php

namespace App\Http\Controllers;

use App\Models\PageView;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Brojanje poseta bez kolačića i bez čuvanja IP adrese.
 * Posetilac se prepoznaje po anonimnom otisku (IP + pregledač + današnji datum + tajna aplikacije) koji se menja
 * svakog dana: tako se broje različiti posetioci po danu, ali se ne mogu pratiti kroz vreme.
 * Botovi se ne broje. Greška pri upisu nikad ne sme da smeta posetiocu.
 */
class TrackController extends Controller
{
    private const BOTS = '/bot|crawl|spider|slurp|facebookexternalhit|whatsapp|viber|telegram|preview|lighthouse|headless|curl|wget|python|java\/|monitor|uptime|pingdom|scan/i';

    public function __invoke(Request $request): Response
    {
        $data = $request->validate([
            'path' => ['required', 'string', 'max:120', 'regex:#^/[A-Za-z0-9\-_/]*$#'],
            'referrer' => ['nullable', 'string', 'max:255'],
            'source' => ['nullable', 'string', 'max:60'],
        ]);

        $agent = (string) $request->userAgent();
        if ($agent === '' || preg_match(self::BOTS, $agent)) {
            return response()->noContent();
        }

        try {
            $day = now('Europe/Belgrade')->toDateString();

            PageView::create([
                'visited_on' => $day,
                'path' => rtrim($data['path'], '/') ?: '/',
                'visitor' => substr(hash('sha256', $day.'|'.$request->ip().'|'.$agent.'|'.config('app.key')), 0, 16),
                'source' => $this->source($data['source'] ?? null, $data['referrer'] ?? null),
                'device' => preg_match('/Mobi|Android|iPhone|iPad/i', $agent) ? 'mobile' : 'desktop',
            ]);
        } catch (Throwable $e) {
            Log::warning('Brojanje posete nije uspelo: '.$e->getMessage());
        }

        return response()->noContent();
    }

    /** Odakle je došao: utm_source ako postoji (npr. "facebook"), inače domen sa kog je stigao (bez www). */
    private function source(?string $utm, ?string $referrer): ?string
    {
        if ($utm !== null && preg_match('/^[A-Za-z0-9._\-]{1,60}$/', $utm)) {
            return strtolower($utm);
        }

        $host = $referrer ? parse_url($referrer, PHP_URL_HOST) : null;
        if (! is_string($host) || $host === '') {
            return null;
        }

        $host = strtolower(preg_replace('/^www\./', '', $host));

        return $host === 'lepsasrbija.com' ? null : mb_substr($host, 0, 60);
    }
}
