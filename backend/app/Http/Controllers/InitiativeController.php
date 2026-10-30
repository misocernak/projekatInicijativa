<?php

namespace App\Http\Controllers;

use App\Http\Resources\InitiativeResource;
use App\Models\Initiative;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class InitiativeController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $filters = $request->validate([
            'city' => ['nullable', 'string', 'max:60'],
            'category' => ['nullable', 'string', 'max:60'],
            'status' => ['nullable', 'in:'.implode(',', Initiative::STATUSES)],
            'q' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $query = Initiative::query()
            ->with(['city:id,slug', 'category:id,slug', 'organizer:id,name'])
            ->withConfirmedCount()
            ->when($filters['city'] ?? null, fn ($q, $slug) => $q->whereHas('city', fn ($c) => $c->where('slug', $slug)))
            ->when($filters['category'] ?? null, fn ($q, $slug) => $q->whereHas('category', fn ($c) => $c->where('slug', $slug)))
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->withStatus($status))
            ->when($filters['q'] ?? null, function ($q, $text) {
                // escape džokera (% i _) i same kose crte, da se pretraga tretira kao običan tekst
                $like = '%'.addcslashes($text, '%_'.chr(92)).'%';

                return $q->where(fn ($w) => $w
                    ->where('title', 'like', $like)
                    ->orWhere('description', 'like', $like)
                    ->orWhere('address', 'like', $like));
            })
            // vremenske po početku, trajne (bez početka) na kraj
            ->orderByRaw('starts_at is null')
            ->orderBy('starts_at')
            ->orderBy('id');

        return InitiativeResource::collection($query->paginate($filters['per_page'] ?? 20)->withQueryString());
    }

    public function show(Initiative $initiative): InitiativeResource
    {
        $initiative->load(['city:id,slug', 'category:id,slug', 'organizer:id,name'])->loadCount([
            'participations as confirmed_count' => fn ($q) => $q->where('status', 'confirmed'),
        ]);

        return new InitiativeResource($initiative);
    }
}
