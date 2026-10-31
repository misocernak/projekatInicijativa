<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Zaštita od botova: Cloudflare Turnstile. Front šalje token u zaglavlju X-Turnstile-Token,
 * a ovde se proverava kod Cloudflare-a. Bez podešenog TURNSTILE_SECRET_KEY provera je isključena
 * (lokalni razvoj i testovi). Uz parametar "guests" prijavljeni korisnici je ne prolaze
 * (rute za prijavu na akciju i prijavu sadržaja).
 */
class VerifyTurnstile
{
    private const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

    public function handle(Request $request, Closure $next, string $guestsOnly = ''): Response
    {
        $secret = config('services.turnstile.secret');

        if (blank($secret) || ($guestsOnly === 'guests' && Auth::guard('sanctum')->check())) {
            return $next($request);
        }

        $token = (string) ($request->header('X-Turnstile-Token') ?: $request->input('cf-turnstile-response', ''));

        if ($token === '') {
            return $this->fail('Potvrdi da nisi robot i pokušaj ponovo.');
        }

        try {
            $result = Http::asForm()->timeout(5)->post(self::VERIFY_URL, [
                'secret' => $secret,
                'response' => $token,
                'remoteip' => $request->ip(),
            ]);
        } catch (Throwable $e) {
            Log::warning('Turnstile provera nije uspela: '.$e->getMessage());

            return $this->fail('Provera trenutno ne radi. Pokušaj ponovo za koji trenutak.', 503);
        }

        if (! $result->ok() || $result->json('success') !== true) {
            return $this->fail('Provera nije prošla. Osveži stranicu i pokušaj ponovo.');
        }

        return $next($request);
    }

    private function fail(string $message, int $status = 422): Response
    {
        return response()->json(['message' => $message, 'errors' => ['captcha' => [$message]]], $status);
    }
}
