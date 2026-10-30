<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * Prijava preko Google-a: OAuth 2.0 tok sa autorizacionim kodom.
 *
 * 1. /auth/google/redirect šalje korisnika na Google, uz nasumičan "state" zapamćen u sesiji (zaštita od CSRF-a).
 * 2. Google vraća korisnika na /auth/google/callback sa kodom; kod se menja za pristupni token (server-server,
 *    uz tajni ključ), pa se čita profil.
 * 3. Prihvata se samo mejl koji je Google potvrdio. Postojeći nalog sa istom adresom se povezuje (uloga ostaje
 *    kakva je), a novi se pravi bez lozinke i uvek sa ulogom "user".
 *
 * Ove rute su u routes/web.php: moraju da imaju sesiju i kada zahtev dolazi sa Google-a (bez Origin-a našeg sajta).
 */
class GoogleAuthController extends Controller
{
    private const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
    private const TOKEN_URL = 'https://oauth2.googleapis.com/token';
    private const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

    public function redirect(Request $request): RedirectResponse
    {
        if (! $this->configured()) {
            return $this->backToLogin('nije-podeseno');
        }

        $state = Str::random(40);
        $request->session()->put('google_oauth_state', $state);
        $request->session()->put('google_oauth_from', $this->safePath((string) $request->query('from')));

        return redirect()->away(self::AUTH_URL.'?'.http_build_query([
            'client_id' => config('services.google.client_id'),
            'redirect_uri' => config('services.google.redirect'),
            'response_type' => 'code',
            'scope' => 'openid email profile',
            'state' => $state,
            'prompt' => 'select_account',
        ]));
    }

    public function callback(Request $request): RedirectResponse
    {
        // state i odredište se troše odmah, da se isti povratak ne može iskoristiti dvaput
        $expected = (string) $request->session()->pull('google_oauth_state', '');
        $from = (string) $request->session()->pull('google_oauth_from', '/profil');

        if ($request->query('error')) {
            return $this->backToLogin('odbijeno');
        }

        $state = (string) $request->query('state');
        $code = (string) $request->query('code');

        if (! $this->configured() || $expected === '' || ! hash_equals($expected, $state) || $code === '') {
            return $this->backToLogin('greska');
        }

        try {
            $token = Http::asForm()->timeout(10)->post(self::TOKEN_URL, [
                'code' => $code,
                'client_id' => config('services.google.client_id'),
                'client_secret' => config('services.google.client_secret'),
                'redirect_uri' => config('services.google.redirect'),
                'grant_type' => 'authorization_code',
            ]);

            $access = $token->successful() ? (string) $token->json('access_token') : '';
            if ($access === '') {
                Log::warning('Google: zamena koda za token nije uspela', ['status' => $token->status()]);

                return $this->backToLogin('greska');
            }

            $info = Http::withToken($access)->timeout(10)->get(self::USERINFO_URL);
            if ($info->failed()) {
                return $this->backToLogin('greska');
            }
        } catch (Throwable $e) {
            Log::error('Google prijava: '.$e->getMessage());

            return $this->backToLogin('greska');
        }

        $profile = (array) $info->json();
        $sub = (string) ($profile['sub'] ?? '');
        $email = Str::lower(trim((string) ($profile['email'] ?? '')));

        if ($sub === '' || $email === '' || ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->backToLogin('greska');
        }

        // bez potvrđenog mejla nema prijave: inače bi neko mogao da se predstavi tuđom adresom
        if (! filter_var($profile['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN)) {
            return $this->backToLogin('nepotvrdjen');
        }

        $user = $this->resolveUser($sub, $email, (string) ($profile['name'] ?? ''));

        if ($user === null) {
            return $this->backToLogin('greska');
        }

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return redirect()->away($this->front().$this->safePath($from));
    }

    /** Pronalazi nalog po Google ID-u ili po mejlu, ili pravi novi. Vraća null ako se identiteti sukobljavaju. */
    private function resolveUser(string $sub, string $email, string $name): ?User
    {
        $user = User::where('google_id', $sub)->first() ?? User::where('email', $email)->first();

        if ($user === null) {
            // password ostaje prazan, a uloga je podrazumevana ("user"): Google nikad ne daje privilegije
            $user = User::create([
                'name' => Str::limit($name !== '' ? $name : Str::before($email, '@'), 120, ''),
                'email' => $email,
            ]);
            $user->forceFill(['google_id' => $sub, 'email_verified_at' => now()])->save();

            return $user;
        }

        // nalog je već povezan sa drugim Google nalogom (npr. adresa je ponovo dodeljena): ne ulazimo
        if ($user->google_id !== null && $user->google_id !== $sub) {
            return null;
        }

        $updates = [];
        if ($user->google_id === null) {
            $updates['google_id'] = $sub;
        }
        if (! $user->hasVerifiedEmail()) {
            $updates['email_verified_at'] = now();
        }
        if ($updates !== []) {
            $user->forceFill($updates)->save();
        }

        return $user;
    }

    private function configured(): bool
    {
        return filled(config('services.google.client_id')) && filled(config('services.google.client_secret'));
    }

    private function front(): string
    {
        return rtrim((string) config('app.url'), '/');
    }

    private function backToLogin(string $status): RedirectResponse
    {
        return redirect()->away($this->front().'/prijava?google='.$status);
    }

    /** Odredište posle prijave: samo putanja na ovom sajtu, nikad spoljni link (zaštita od preusmeravanja na tuđ sajt). */
    private function safePath(string $path): string
    {
        return preg_match('#^/(?!/)[A-Za-z0-9/_.?=&%-]*$#', $path) === 1 ? $path : '/profil';
    }
}
