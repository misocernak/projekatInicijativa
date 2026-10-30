<?php

namespace App\Http\Resources;

use App\Models\Initiative;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Oblik odgovora je isti kao tip Initiative na frontu (frontend/src/types.ts),
 * pa front ne mora da prepravlja stranice kada pređe sa mock podataka na API.
 *
 * Prijavljenom korisniku se dodaje i "viewer": da li je organizator i kakva je njegova prijava.
 *
 * @mixin Initiative
 */
class InitiativeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $data = [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'category' => $this->category->slug,
            'cityId' => $this->city->slug,
            'address' => $this->address,
            'lat' => $this->lat,
            'lng' => $this->lng,
            'kind' => $this->kind,
            'startDate' => $this->starts_at?->toIso8601String(),
            'endDate' => $this->ends_at?->toIso8601String(),
            'capacity' => $this->capacity,
            'participants' => (int) ($this->confirmed_count ?? 0),
            'bring' => $this->bring,
            'organizerId' => (string) $this->user_id,
            'organizerName' => $this->organizer->name,
            'contact' => $this->contact,
            'image' => $this->image_path ? rtrim(config('app.url'), '/').'/uploads/'.$this->image_path : null,
            'cancelled' => $this->cancelled_at !== null,
        ];

        // Prazna opciona polja se izostavljaju, kao undefined na frontu.
        $data = array_filter($data, fn ($v) => $v !== null);

        if ($user = $request->user()) {
            $map = $request->attributes->get('participationMap', []);
            $data['viewer'] = [
                'isOrganizer' => (int) $user->id === (int) $this->user_id,
                'participation' => $map[$this->id] ?? null,
            ];
        }

        return $data;
    }
}
