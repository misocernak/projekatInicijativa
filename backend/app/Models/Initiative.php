<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Initiative extends Model
{
    use HasUlids;

    public const STATUSES = ['upcoming', 'ongoing', 'finished', 'permanent', 'cancelled'];

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'lat' => 'float',
            'lng' => 'float',
            'capacity' => 'integer',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'cancelled_at' => 'datetime',
        ];
    }

    public function organizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function participations(): HasMany
    {
        return $this->hasMany(Participation::class);
    }

    /** Dodaje confirmed_count: broj potvrđenih prijava. */
    public function scopeWithConfirmedCount(Builder $query): Builder
    {
        return $query->withCount([
            'participations as confirmed_count' => fn (Builder $q) => $q->where('status', Participation::CONFIRMED),
        ]);
    }

    /** Isti statusi kao na frontu: upcoming, ongoing, finished, permanent, cancelled. */
    public function scopeWithStatus(Builder $query, ?string $status): Builder
    {
        $now = now();
        $active = fn (Builder $q) => $q->whereNull('cancelled_at');

        return match ($status) {
            'cancelled' => $query->whereNotNull('cancelled_at'),
            'permanent' => $active($query)->where('kind', 'permanent'),
            'upcoming' => $active($query)->where('kind', 'timed')->where('starts_at', '>', $now),
            'ongoing' => $active($query)->where('kind', 'timed')->where('starts_at', '<=', $now)->where('ends_at', '>=', $now),
            'finished' => $active($query)->where('kind', 'timed')->where('ends_at', '<', $now),
            default => $query,
        };
    }
}
