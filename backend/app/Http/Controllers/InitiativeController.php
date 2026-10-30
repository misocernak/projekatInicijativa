<?php

namespace App\Http\Controllers;

use App\Http\Resources\InitiativeResource;
use App\Models\Category;
use App\Models\City;
use App\Models\Initiative;
use App\Models\Participation;
use App\Notifications\InitiativeCancelled;
use App\Notifications\InitiativeUpdated;
use App\Support\ImageStore;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

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
            ->forListing()
            ->whereNull('hidden_at')
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

        $page = $query->paginate($filters['per_page'] ?? 20)->withQueryString();
        $this->rememberViewer($request, $page->getCollection()->pluck('id'));

        return InitiativeResource::collection($page);
    }

    public function show(Request $request, Initiative $initiative): InitiativeResource
    {
        // sakrivenu akciju vide samo organizator i admin; za ostale ona ne postoji
        if ($initiative->isHidden()) {
            $viewer = $request->user();
            abort_unless($viewer && Gate::forUser($viewer)->allows('update', $initiative), 404);
        }

        $this->rememberViewer($request, collect([$initiative->id]));

        return new InitiativeResource($this->loaded($initiative));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules() + [
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
        ], $this->messages());

        $initiative = DB::transaction(function () use ($request, $data) {
            $initiative = Initiative::create($this->attributes($data) + ['user_id' => $request->user()->id]);

            if ($request->hasFile('image')) {
                $initiative->image_path = ImageStore::store($request->file('image'), $this->imageName($initiative));
                $initiative->save();
            }

            return $initiative;
        });

        return (new InitiativeResource($this->loaded($initiative)))->response()->setStatusCode(201);
    }

    public function update(Request $request, Initiative $initiative): InitiativeResource
    {
        Gate::authorize('update', $initiative);
        abort_if($initiative->isCancelled(), 422, 'Otkazana akcija se ne može menjati.');

        $rules = $this->rules();

        // početak koji se nije menjao ne mora da bude u budućnosti (ispravka naslova akcije koja je u toku)
        $start = $request->input('startDate');
        if (is_string($start) && strtotime($start) !== false && $initiative->starts_at && Carbon::parse($start)->eq($initiative->starts_at)) {
            $rules['startDate'] = ['required_if:kind,timed', 'nullable', 'date'];
        }

        $data = $request->validate($rules, $this->messages());
        $initiative->fill($this->attributes($data));

        // prijavljene obaveštavamo samo kada se menja kada ili gde, ne zbog svakog ispravljenog slova
        $moved = $initiative->isDirty(['starts_at', 'ends_at', 'address', 'lat', 'lng', 'city_id']);
        $initiative->save();

        if ($moved) {
            $this->notifyParticipants($initiative, new InitiativeUpdated($initiative));
        }

        return new InitiativeResource($this->loaded($initiative));
    }

    public function cancel(Request $request, Initiative $initiative): InitiativeResource
    {
        Gate::authorize('cancel', $initiative);

        if (! $initiative->isCancelled()) {
            $initiative->forceFill(['cancelled_at' => now()])->save();
            $this->notifyParticipants($initiative, new InitiativeCancelled($initiative));
        }

        return new InitiativeResource($this->loaded($initiative));
    }

    public function uploadImage(Request $request, Initiative $initiative): InitiativeResource
    {
        Gate::authorize('update', $initiative);

        $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
        ], [
            'image.required' => 'Izaberi sliku.',
            'image.image' => 'Fajl mora biti slika.',
            'image.mimes' => 'Dozvoljene su slike JPG, PNG i WebP.',
            'image.max' => 'Slika je prevelika (najviše 8 MB).',
        ]);

        ImageStore::delete($initiative->image_path);
        $initiative->image_path = ImageStore::store($request->file('image'), $this->imageName($initiative));
        $initiative->save();

        return new InitiativeResource($this->loaded($initiative));
    }

    public function deleteImage(Initiative $initiative): InitiativeResource
    {
        Gate::authorize('update', $initiative);

        ImageStore::delete($initiative->image_path);
        $initiative->forceFill(['image_path' => null])->save();

        return new InitiativeResource($this->loaded($initiative));
    }

    /** Spisak prijavljenih, samo za organizatora (bez mejl adresa). */
    public function participants(Initiative $initiative): JsonResponse
    {
        Gate::authorize('viewParticipants', $initiative);

        $rows = $initiative->participations()
            ->whereIn('status', [Participation::PENDING, Participation::CONFIRMED])
            ->with('user:id,name')
            ->orderBy('created_at')
            ->get()
            ->map(fn (Participation $p) => [
                'name' => $p->user->name,
                'status' => $p->status,
                'joinedAt' => ($p->confirmed_at ?? $p->created_at)->toIso8601String(),
            ]);

        return response()->json(['data' => $rows->values()]);
    }

    /** @return array<string, mixed> */
    private function rules(): array
    {
        return [
            'title' => ['required', 'string', 'min:3', 'max:160'],
            'description' => ['required', 'string', 'min:10', 'max:5000'],
            'category' => ['required', 'string', 'exists:categories,slug'],
            'cityId' => ['required', 'string', 'exists:cities,slug'],
            'address' => ['required', 'string', 'max:255'],
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'kind' => ['required', 'in:timed,permanent'],
            'startDate' => ['required_if:kind,timed', 'nullable', 'date', 'after:-1 day'],
            'endDate' => ['required_if:kind,timed', 'nullable', 'date', 'after:startDate'],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:1000'],
            'bring' => ['nullable', 'string', 'max:255'],
            'contact' => ['nullable', 'string', 'max:160'],
        ];
    }

    /** @return array<string, string> */
    private function messages(): array
    {
        return [
            'title.required' => 'Unesi naslov.',
            'title.min' => 'Naslov je prekratak.',
            'description.required' => 'Unesi opis.',
            'description.min' => 'Opis je prekratak, dodaj još par rečenica.',
            'category.exists' => 'Izabrana vrsta ne postoji.',
            'cityId.exists' => 'Izabrani grad ne postoji.',
            'address.required' => 'Unesi adresu ili opis mesta.',
            'startDate.required_if' => 'Unesi početak akcije.',
            'startDate.after' => 'Početak ne može biti u prošlosti.',
            'endDate.required_if' => 'Unesi kraj akcije.',
            'endDate.after' => 'Kraj mora biti posle početka.',
            'image.image' => 'Fajl mora biti slika.',
            'image.mimes' => 'Dozvoljene su slike JPG, PNG i WebP.',
            'image.max' => 'Slika je prevelika (najviše 8 MB).',
        ];
    }

    /**
     * Provereni podaci sa fronta u kolone tabele.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function attributes(array $data): array
    {
        $timed = $data['kind'] === 'timed';

        return [
            'city_id' => City::where('slug', $data['cityId'])->value('id'),
            'category_id' => Category::where('slug', $data['category'])->value('id'),
            'title' => trim($data['title']),
            'description' => trim($data['description']),
            'address' => trim($data['address']),
            'lat' => $data['lat'],
            'lng' => $data['lng'],
            'kind' => $data['kind'],
            'starts_at' => $timed ? Carbon::parse($data['startDate'])->utc() : null,
            'ends_at' => $timed ? Carbon::parse($data['endDate'])->utc() : null,
            'capacity' => $data['capacity'] ?? null,
            'bring' => $data['bring'] ?? null,
            'contact' => $data['contact'] ?? null,
        ];
    }

    private function imageName(Initiative $initiative): string
    {
        // novo ime pri svakoj promeni slike, da pretraživač ne prikazuje staru iz keša
        return $initiative->id.'-'.Str::lower(Str::random(6));
    }

    private function loaded(Initiative $initiative): Initiative
    {
        return $initiative->load(['city:id,slug', 'category:id,slug', 'organizer:id,name'])->loadCount([
            'participations as confirmed_count' => fn ($q) => $q->where('status', Participation::CONFIRMED),
        ]);
    }

    /** Zapamti status prijave prijavljenog korisnika za prikaz, jednim upitom umesto po akciji. */
    private function rememberViewer(Request $request, $ids): void
    {
        $user = $request->user();

        if (! $user) {
            return;
        }

        $request->attributes->set('participationMap', Participation::where('user_id', $user->id)
            ->whereIn('initiative_id', $ids)
            ->pluck('status', 'initiative_id')
            ->all());
    }

    private function notifyParticipants(Initiative $initiative, Notification $notification): void
    {
        $initiative->participations()
            ->where('status', Participation::CONFIRMED)
            ->with('user')
            ->each(function (Participation $participation) use ($notification) {
                try {
                    $participation->user->notify($notification);
                } catch (Throwable $e) {
                    Log::error('Obaveštenje prijavljenom nije poslato: '.$e->getMessage());
                }
            });
    }
}
