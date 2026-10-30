<?php

namespace App\Http\Controllers;

use App\Models\Initiative;
use App\Models\Participation;
use App\Models\Report;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

/**
 * Brojke za admin pregled. Sve su jednostavni upiti nad postojećim tabelama, bez posebnog skladišta statistike.
 */
class AdminStatsController extends Controller
{
    private const DAYS = 30;

    public function __invoke(): JsonResponse
    {
        $since7 = now()->subDays(7);
        $since30 = now()->subDays(self::DAYS);

        $statuses = [];
        foreach (Initiative::STATUSES as $status) {
            $statuses[$status] = Initiative::withStatus($status)->count();
        }
        $statuses['hidden'] = Initiative::whereNotNull('hidden_at')->count();

        return response()->json([
            'generatedAt' => now()->toIso8601String(),
            'users' => [
                'total' => User::count(),
                'verified' => User::whereNotNull('email_verified_at')->count(),
                'unverified' => User::whereNull('email_verified_at')->count(),
                // nalozi nastali brzom prijavom na akciju, bez lozinke
                'quick' => User::whereNull('password')->count(),
                'admins' => User::where('role', 'admin')->count(),
                'new7' => User::where('created_at', '>=', $since7)->count(),
                'new30' => User::where('created_at', '>=', $since30)->count(),
            ],
            'initiatives' => [
                'total' => Initiative::count(),
                'new7' => Initiative::where('created_at', '>=', $since7)->count(),
                'new30' => Initiative::where('created_at', '>=', $since30)->count(),
                'byStatus' => $statuses,
                'byCategory' => $this->breakdown('categories', 'category_id', 'name', 'slug'),
                'byCity' => $this->breakdown('cities', 'city_id', 'name', 'slug', 10),
            ],
            'participations' => [
                'confirmed' => Participation::where('status', Participation::CONFIRMED)->count(),
                'pending' => Participation::where('status', Participation::PENDING)->count(),
                'cancelled' => Participation::where('status', Participation::CANCELLED)->count(),
                'volunteers' => Participation::where('status', Participation::CONFIRMED)->distinct()->count('user_id'),
                'new7' => Participation::where('status', Participation::CONFIRMED)->where('confirmed_at', '>=', $since7)->count(),
            ],
            'reports' => [
                'open' => Report::where('status', 'open')->count(),
                'resolved' => Report::where('status', 'resolved')->count(),
            ],
            'series' => [
                'users' => $this->perDay('users', $since30),
                'initiatives' => $this->perDay('initiatives', $since30),
                'participations' => $this->perDay('participations', $since30, 'confirmed_at', ['status' => Participation::CONFIRMED]),
            ],
        ]);
    }

    /**
     * Broj akcija po šifarniku (kategorija, grad), od najvećeg ka manjem.
     *
     * @return list<array{slug: string, name: string, count: int}>
     */
    private function breakdown(string $table, string $foreignKey, string $nameColumn, string $slugColumn, ?int $limit = null): array
    {
        $query = DB::table('initiatives')
            ->join($table, "{$table}.id", '=', "initiatives.{$foreignKey}")
            ->selectRaw("{$table}.{$slugColumn} as slug, {$table}.{$nameColumn} as name, COUNT(*) as total")
            ->groupBy("{$table}.{$slugColumn}", "{$table}.{$nameColumn}")
            ->orderByDesc('total')
            ->orderBy('name');

        if ($limit) {
            $query->limit($limit);
        }

        return $query->get()
            ->map(fn ($row) => ['slug' => $row->slug, 'name' => $row->name, 'count' => (int) $row->total])
            ->all();
    }

    /**
     * Broj zapisa po danu u poslednjih 30 dana; dani bez zapisa su 0, da grafikon nema rupa.
     *
     * @param  array<string, mixed>  $where
     * @return list<array{date: string, count: int}>
     */
    private function perDay(string $table, CarbonInterface $since, string $dateColumn = 'created_at', array $where = []): array
    {
        $from = $since->copy()->startOfDay();

        $counts = DB::table($table)
            ->where($where)
            ->where($dateColumn, '>=', $from)
            ->selectRaw("DATE({$dateColumn}) as day, COUNT(*) as total")
            ->groupBy('day')
            ->pluck('total', 'day');

        $series = [];
        for ($i = 0; $i <= self::DAYS; $i++) {
            $day = $from->copy()->addDays($i)->format('Y-m-d');
            $series[] = ['date' => $day, 'count' => (int) ($counts[$day] ?? 0)];
        }

        return $series;
    }
}
