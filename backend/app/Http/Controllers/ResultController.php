<?php

namespace App\Http\Controllers;

use App\Http\Resources\InitiativeResource;
use App\Models\Initiative;
use App\Models\Participation;
use App\Support\ImageStore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

/**
 * "Realizovano": završene akcije sa opisom šta je urađeno.
 * Objavljuje organizator (ili admin) kada akcija završi; javni spisak i brojke su na GET /results.
 */
class ResultController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'city' => ['nullable', 'string', 'max:60'],
            'category' => ['nullable', 'string', 'max:60'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:48'],
        ]);

        $base = Initiative::query()->whereNull('hidden_at')->whereNotNull('result_published_at');

        $stats = [
            'actions' => (clone $base)->count(),
            'volunteers' => (int) Participation::query()
                ->where('status', Participation::CONFIRMED)
                ->whereIn('initiative_id', (clone $base)->select('id'))
                ->count(),
            'cities' => (clone $base)->distinct()->count('city_id'),
        ];

        $page = (clone $base)
            ->forListing()
            ->when($filters['city'] ?? null, fn ($q, $slug) => $q->whereHas('city', fn ($c) => $c->where('slug', $slug)))
            ->when($filters['category'] ?? null, fn ($q, $slug) => $q->whereHas('category', fn ($c) => $c->where('slug', $slug)))
            ->orderByDesc('result_published_at')
            ->orderBy('id')
            ->paginate($filters['per_page'] ?? 24)
            ->withQueryString();

        return response()->json([
            'stats' => $stats,
            'data' => InitiativeResource::collection($page)->resolve($request),
            'meta' => ['page' => $page->currentPage(), 'lastPage' => $page->lastPage(), 'total' => $page->total()],
        ]);
    }

    /** Objavljuje rezultat ili menja već objavljen (tekst i/ili slike). */
    public function store(Request $request, Initiative $initiative): InitiativeResource
    {
        Gate::authorize('update', $initiative);
        abort_if($initiative->isCancelled() || $initiative->isHidden(), 422, 'Za ovu akciju se ne može objaviti rezultat.');
        abort_unless($initiative->isFinished(), 422, 'Rezultat se objavljuje kada akcija završi.');

        $hasAfter = $initiative->result_after_path !== null;
        $image = ['image', 'mimes:jpg,jpeg,png,webp', 'max:8192'];

        $data = $request->validate([
            'text' => ['required', 'string', 'min:20', 'max:3000'],
            'before' => ['nullable', ...$image],
            'after' => [$hasAfter ? 'nullable' : 'required', ...$image],
            'removeBefore' => ['nullable', 'boolean'],
        ], [
            'text.required' => 'Napiši šta je urađeno.',
            'text.min' => 'Opis je prekratak, napiši bar par rečenica.',
            'after.required' => 'Dodaj sliku kako je ispalo na kraju.',
            'before.image' => 'Fajl mora biti slika.',
            'after.image' => 'Fajl mora biti slika.',
            'before.mimes' => 'Dozvoljene su slike JPG, PNG i WebP.',
            'after.mimes' => 'Dozvoljene su slike JPG, PNG i WebP.',
            'before.max' => 'Slika je prevelika (najviše 8 MB).',
            'after.max' => 'Slika je prevelika (najviše 8 MB).',
        ]);

        if ($request->hasFile('before')) {
            ImageStore::delete($initiative->result_before_path);
            $initiative->result_before_path = ImageStore::store($request->file('before'), $this->name($initiative, 'pre'));
        } elseif ($request->boolean('removeBefore')) {
            ImageStore::delete($initiative->result_before_path);
            $initiative->result_before_path = null;
        }

        if ($request->hasFile('after')) {
            ImageStore::delete($initiative->result_after_path);
            $initiative->result_after_path = ImageStore::store($request->file('after'), $this->name($initiative, 'posle'));
        }

        $initiative->result_text = trim($data['text']);
        $initiative->result_published_at ??= now();
        $initiative->save();

        return new InitiativeResource($this->loaded($initiative));
    }

    /** Uklanja rezultat sa javne strane "Realizovano" (akcija ostaje). */
    public function destroy(Initiative $initiative): JsonResponse
    {
        Gate::authorize('update', $initiative);

        ImageStore::delete($initiative->result_before_path);
        ImageStore::delete($initiative->result_after_path);
        $initiative->forceFill([
            'result_text' => null,
            'result_before_path' => null,
            'result_after_path' => null,
            'result_published_at' => null,
        ])->save();

        return response()->json(['status' => 'removed']);
    }

    private function name(Initiative $initiative, string $kind): string
    {
        return $initiative->id.'-'.$kind.'-'.Str::lower(Str::random(6));
    }

    private function loaded(Initiative $initiative): Initiative
    {
        return $initiative->load(['city:id,slug', 'category:id,slug', 'organizer:id,name'])->loadCount([
            'participations as confirmed_count' => fn ($q) => $q->where('status', Participation::CONFIRMED),
        ]);
    }
}
