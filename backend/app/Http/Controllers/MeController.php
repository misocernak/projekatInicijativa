<?php

namespace App\Http\Controllers;

use App\Http\Resources\InitiativeResource;
use App\Models\Initiative;
use App\Models\Participation;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Podaci prijavljenog korisnika za stranicu "Moj profil".
 */
class MeController extends Controller
{
    public function initiatives(Request $request): AnonymousResourceCollection
    {
        $items = Initiative::forListing()
            ->where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        $this->rememberViewer($request, $items);

        return InitiativeResource::collection($items);
    }

    /** Inicijative na koje je korisnik prijavljen (potvrđeno ili čeka potvrdu). */
    public function participations(Request $request): AnonymousResourceCollection
    {
        $userId = $request->user()->id;

        $items = Initiative::forListing()
            ->whereNull('hidden_at')
            ->whereHas('participations', fn ($q) => $q
                ->where('user_id', $userId)
                ->whereIn('status', [Participation::PENDING, Participation::CONFIRMED]))
            ->orderByRaw('starts_at is null')
            ->orderBy('starts_at')
            ->limit(100)
            ->get();

        $this->rememberViewer($request, $items);

        return InitiativeResource::collection($items);
    }

    private function rememberViewer(Request $request, $items): void
    {
        $request->attributes->set('participationMap', Participation::where('user_id', $request->user()->id)
            ->whereIn('initiative_id', $items->pluck('id'))
            ->pluck('status', 'initiative_id')
            ->all());
    }
}
