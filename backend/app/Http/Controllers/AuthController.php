<?php

namespace App\Http\Controllers;

use App\Models\City;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password as PasswordBroker;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Prijava preko sesije (Sanctum SPA, isti domen). Front prvo pozove /sanctum/csrf-cookie.
 */
class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $this->requireSession($request);

        // Mejl je već korišćen za brzu prijavu na akciju (nalog bez lozinke): umesto greške šaljemo link
        // za aktivaciju. Link stiže na tu adresu, pa samo njen vlasnik može da postavi lozinku.
        $email = Str::lower((string) $request->input('email'));
        $quick = filter_var($email, FILTER_VALIDATE_EMAIL)
            ? User::where('email', $email)->whereNull('password')->first()
            : null;

        if ($quick) {
            return response()->json([
                'status' => 'activation-sent',
                'mailSent' => $this->sendActivation($quick),
            ], 202);
        }

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email:rfc', 'max:190', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'max:100', 'confirmed'],
            'city' => ['nullable', 'string', 'exists:cities,slug'],
            'consent' => ['accepted'],
        ], [
            'name.required' => 'Unesi ime.',
            'email.required' => 'Unesi mejl adresu.',
            'email.email' => 'Mejl adresa nije ispravna.',
            'email.unique' => 'Nalog sa ovom mejl adresom već postoji. Probaj prijavu ili reset lozinke.',
            'password.required' => 'Unesi lozinku.',
            'password.min' => 'Lozinka mora imati najmanje 8 znakova.',
            'password.confirmed' => 'Lozinke se ne poklapaju.',
            'city.exists' => 'Izabrani grad ne postoji.',
            'consent.accepted' => 'Moraš da prihvatiš uslove korišćenja i obradu podataka.',
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => Str::lower($data['email']),
            'password' => $data['password'],
            'city_id' => isset($data['city']) ? City::where('slug', $data['city'])->value('id') : null,
        ]);

        $mailSent = $this->sendVerification($user);

        Auth::guard('web')->login($user);
        $request->session()->regenerate();

        return response()->json([
            'user' => $this->payload($user),
            'verificationEmailSent' => $mailSent,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $this->requireSession($request);

        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $ok = Auth::guard('web')->attempt([
            'email' => Str::lower($credentials['email']),
            'password' => $credentials['password'],
        ]);

        if (! $ok) {
            throw ValidationException::withMessages(['email' => ['Pogrešna mejl adresa ili lozinka.']]);
        }

        $request->session()->regenerate();

        return response()->json(['user' => $this->payload($request->user('web'))]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['status' => 'ok']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $this->payload($request->user())]);
    }

    /** Ponovno slanje mejla za potvrdu adrese. */
    public function resendVerification(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json(['status' => 'already-verified']);
        }

        return response()->json(['status' => $this->sendVerification($user) ? 'sent' : 'failed']);
    }

    /** Link iz mejla (potpisan). Posle potvrde vodi na front. */
    public function verifyEmail(string $id, string $hash): RedirectResponse
    {
        $front = rtrim(config('app.url'), '/').'/potvrda-mejla';
        $user = User::find($id);

        if (! $user || ! hash_equals(sha1($user->getEmailForVerification()), $hash)) {
            return redirect()->away($front.'?status=invalid');
        }

        if (! $user->hasVerifiedEmail() && $user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        return redirect()->away($front.'?status=ok');
    }

    /** Uvek isti odgovor, da se ne otkrije koje mejl adrese imaju nalog. */
    public function forgotPassword(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => ['required', 'email']]);

        try {
            PasswordBroker::sendResetLink(['email' => Str::lower($data['email'])]);
        } catch (Throwable $e) {
            Log::error('Slanje mejla za reset lozinke nije uspelo: '.$e->getMessage());
        }

        return response()->json(['status' => 'ok']);
    }

    /** Postavlja novu lozinku. Radi i za "brze" naloge bez lozinke: link iz mejla dokazuje vlasništvo adrese. */
    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'string', 'min:8', 'max:100', 'confirmed'],
        ], [
            'password.min' => 'Lozinka mora imati najmanje 8 znakova.',
            'password.confirmed' => 'Lozinke se ne poklapaju.',
        ]);

        $status = PasswordBroker::reset(
            [
                'email' => Str::lower($data['email']),
                'password' => $data['password'],
                'password_confirmation' => $data['password_confirmation'] ?? $data['password'],
                'token' => $data['token'],
            ],
            function (User $user, string $password) {
                $user->forceFill(['password' => $password, 'remember_token' => Str::random(60)])->save();

                if (! $user->hasVerifiedEmail()) {
                    $user->markEmailAsVerified();
                }

                event(new PasswordReset($user));
            }
        );

        if ($status !== PasswordBroker::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => ['Link za reset lozinke nije važeći ili je istekao.']]);
        }

        return response()->json(['status' => 'ok']);
    }

    /** Šalje link za postavljanje lozinke (isti mehanizam kao "zaboravljena lozinka"). */
    private function sendActivation(User $user): bool
    {
        try {
            PasswordBroker::sendResetLink(['email' => $user->email]);

            return true;
        } catch (Throwable $e) {
            Log::error('Slanje mejla za aktivaciju naloga nije uspelo: '.$e->getMessage());

            return false;
        }
    }

    /** Oblik korisnika za front. */
    private function payload(User $user): array
    {
        return [
            'id' => (string) $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'cityId' => $user->city?->slug,
            'emailVerified' => $user->hasVerifiedEmail(),
            // novi korisnik nema učitanu podrazumevanu vrednost iz baze
            'role' => $user->role ?? 'user',
        ];
    }

    /** Neuspelo slanje mejla ne sme da obori registraciju: beleži se, a korisnik može da zatraži ponovo. */
    private function sendVerification(User $user): bool
    {
        try {
            $user->sendEmailVerificationNotification();

            return true;
        } catch (Throwable $e) {
            Log::error('Slanje mejla za potvrdu nije uspelo: '.$e->getMessage());

            return false;
        }
    }

    /** Sesija postoji samo kada zahtev stiže sa fronta (Origin/Referer), što je jedini ispravan izvor. */
    private function requireSession(Request $request): void
    {
        abort_unless($request->hasSession(), 400, 'Zahtev mora stići sa sajta.');
    }
}
