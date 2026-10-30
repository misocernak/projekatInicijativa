<?php

namespace App\Http\Controllers;

use App\Models\Initiative;
use App\Models\Participation;
use App\Models\User;
use App\Notifications\ConfirmParticipation;
use App\Notifications\ParticipationConfirmed;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Throwable;

/**
 * Prijava volontera na inicijativu.
 *
 * - Prijavljen korisnik sa potvrđenim mejlom: prijava je odmah potvrđena.
 * - Gost (samo ime i mejl) ili nepotvrđen nalog: prijava čeka klik na link iz mejla, koji dokazuje
 *   da je adresa njihova. Tek tada se računa među prijavljene i stižu detalji sa kalendarom.
 */
class ParticipationController extends Controller
{
    public function join(Request $request, Initiative $initiative): JsonResponse
    {
        abort_unless($initiative->isOpen(), 422, 'Prijave za ovu inicijativu više nisu moguće.');

        $user = $request->user();

        return $user ? $this->joinAsUser($initiative, $user) : $this->joinAsGuest($request, $initiative);
    }

    public function leave(Request $request, Initiative $initiative): JsonResponse
    {
        $participation = Participation::where('initiative_id', $initiative->id)
            ->where('user_id', $request->user()->id)
            ->first();

        if ($participation && $participation->status !== Participation::CANCELLED) {
            $participation->forceFill(['status' => Participation::CANCELLED])->save();
        }

        return response()->json(['status' => 'cancelled']);
    }

    /** Potpisan link iz mejla: potvrda prijave. */
    public function confirm(Participation $participation): RedirectResponse
    {
        $participation->load(['initiative', 'user']);
        $initiative = $participation->initiative;
        $back = rtrim(config('app.url'), '/').'/inicijative/'.$initiative->id;

        if (! $initiative->isOpen()) {
            return redirect()->away($back.'?prijava=zatvorena');
        }

        if ($participation->status !== Participation::CONFIRMED) {
            if ($initiative->isFull()) {
                return redirect()->away($back.'?prijava=popunjeno');
            }

            $participation->forceFill([
                'status' => Participation::CONFIRMED,
                'confirmed_at' => now(),
            ])->save();

            // klik na link iz mejla dokazuje da je adresa njegova
            if (! $participation->user->hasVerifiedEmail()) {
                $participation->user->markEmailAsVerified();
            }

            $this->send($participation->user, new ParticipationConfirmed($participation));
        }

        return redirect()->away($back.'?prijava=potvrdjena');
    }

    /** Potpisan link iz mejla: odjava bez prijavljivanja na nalog. */
    public function cancelByLink(Participation $participation): RedirectResponse
    {
        if ($participation->status !== Participation::CANCELLED) {
            $participation->forceFill(['status' => Participation::CANCELLED])->save();
        }

        return redirect()->away(rtrim(config('app.url'), '/').'/inicijative/'.$participation->initiative_id.'?prijava=otkazana');
    }

    private function joinAsUser(Initiative $initiative, User $user): JsonResponse
    {
        $participation = Participation::firstOrNew([
            'initiative_id' => $initiative->id,
            'user_id' => $user->id,
        ]);

        if ($participation->status === Participation::CONFIRMED) {
            return response()->json(['status' => 'confirmed']);
        }

        abort_if($initiative->isFull(), 422, 'Nema slobodnih mesta.');

        if ($user->hasVerifiedEmail()) {
            $participation->forceFill(['status' => Participation::CONFIRMED, 'confirmed_at' => now()])->save();
            $participation->setRelation('initiative', $initiative);
            $this->send($user, new ParticipationConfirmed($participation));

            return response()->json(['status' => 'confirmed'], 201);
        }

        $participation->forceFill(['status' => Participation::PENDING])->save();
        $participation->setRelation('initiative', $initiative);
        $sent = $this->send($user, new ConfirmParticipation($participation));

        return response()->json(['status' => 'pending', 'mailSent' => $sent], 202);
    }

    private function joinAsGuest(Request $request, Initiative $initiative): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email:rfc', 'max:190'],
            'consent' => ['accepted'],
        ], [
            'name.required' => 'Unesi ime.',
            'email.required' => 'Unesi mejl adresu.',
            'email.email' => 'Mejl adresa nije ispravna.',
            'consent.accepted' => 'Moraš da prihvatiš obradu podataka da bismo ti poslali detalje.',
        ]);

        $email = Str::lower($data['email']);

        // sprečava da neko preko ovog obrasca zaspe tuđ mejl porukama
        abort_unless(
            RateLimiter::attempt('join-mail:'.sha1($email), 3, fn () => true, 3600),
            429,
            'Previše pokušaja prijave sa ove mejl adrese. Probaj ponovo za sat vremena.'
        );

        abort_if($initiative->isFull(), 422, 'Nema slobodnih mesta.');

        // postojeći nalog se ne dira (ni ime ni lozinka), a novi nema lozinku dok je ne postavi preko "zaboravljena lozinka"
        $user = User::firstOrCreate(['email' => $email], ['name' => $data['name']]);

        $participation = Participation::firstOrNew([
            'initiative_id' => $initiative->id,
            'user_id' => $user->id,
        ]);

        $sent = true;

        if ($participation->status !== Participation::CONFIRMED) {
            $participation->forceFill(['status' => Participation::PENDING])->save();
            $participation->setRelation('initiative', $initiative);
            $sent = $this->send($user, new ConfirmParticipation($participation));
        }

        // isti odgovor bez obzira da li nalog već postoji, da se ne otkriva ko ima nalog
        return response()->json(['status' => 'pending', 'mailSent' => $sent], 202);
    }

    /** Neuspelo slanje mejla ne sme da obori zahtev: beleži se, a korisnik može da pokuša ponovo. */
    private function send(User $user, Notification $notification): bool
    {
        try {
            $user->notify($notification);

            return true;
        } catch (Throwable $e) {
            Log::error('Slanje mejla nije uspelo: '.$e->getMessage());

            return false;
        }
    }
}
