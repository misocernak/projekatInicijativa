<?php

namespace App\Http\Controllers;

use App\Models\Initiative;
use App\Models\PageView;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Posete za admin pregled: danas / 7 / 30 dana / ukupno, dnevni i mesečni tok, najposećenije strane, izvori, uređaji.
 * "Posetioci" su zbir dnevnih različitih posetilaca (isti čovek koji dođe dva dana računa se dva puta).
 */
class TrafficController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $range = (int) $request->query('range', 30);
        $range = in_array($range, [7, 30, 90, 365], true) ? $range : 30;

        $today = now('Europe/Belgrade')->startOfDay();
        $from = $today->copy()->subDays($range - 1);

        // jedan prolaz: pregledi i posetioci po danu za poslednjih 365 dana, od toga se računa sve ostalo
        $yearFrom = $today->copy()->subDays(364);
        $perDay = PageView::query()
            ->where('visited_on', '>=', $yearFrom->toDateString())
            ->selectRaw('visited_on as day, COUNT(*) as views, COUNT(DISTINCT visitor) as visitors')
            ->groupBy('visited_on')
            ->get()
            ->mapWithKeys(fn ($r) => [substr((string) $r->day, 0, 10) => ['views' => (int) $r->views, 'visitors' => (int) $r->visitors]]);

        $sum = function (int $days) use ($perDay, $today) {
            $views = $visitors = 0;
            for ($i = 0; $i < $days; $i++) {
                $d = $perDay[$today->copy()->subDays($i)->toDateString()] ?? null;
                $views += $d['views'] ?? 0;
                $visitors += $d['visitors'] ?? 0;
            }

            return ['views' => $views, 'visitors' => $visitors];
        };

        $daily = [];
        for ($i = 0; $i < $range; $i++) {
            $day = $from->copy()->addDays($i)->toDateString();
            $daily[] = ['date' => $day, 'views' => $perDay[$day]['views'] ?? 0, 'visitors' => $perDay[$day]['visitors'] ?? 0];
        }

        // poslednjih 12 meseci (kalendarski)
        $monthly = [];
        for ($m = 11; $m >= 0; $m--) {
            $key = $today->copy()->startOfMonth()->subMonths($m)->format('Y-m');
            $monthly[$key] = ['month' => $key, 'views' => 0, 'visitors' => 0];
        }
        foreach ($perDay as $day => $v) {
            $key = substr($day, 0, 7);
            if (isset($monthly[$key])) {
                $monthly[$key]['views'] += $v['views'];
                $monthly[$key]['visitors'] += $v['visitors'];
            }
        }

        $inRange = fn () => PageView::query()->where('visited_on', '>=', $from->toDateString());

        $pages = $inRange()
            ->selectRaw('path, COUNT(*) as views, COUNT(DISTINCT visitor) as visitors')
            ->groupBy('path')
            ->orderByDesc('views')
            ->limit(25)
            ->get();

        $titles = Initiative::query()
            ->whereIn('id', $pages->map(fn ($p) => $this->initiativeId($p->path))->filter()->all())
            ->pluck('title', 'id');

        $sources = $inRange()
            ->selectRaw("COALESCE(source, 'direktno') as name, COUNT(*) as views")
            ->groupBy(DB::raw("COALESCE(source, 'direktno')"))
            ->orderByDesc('views')
            ->limit(10)
            ->get()
            ->map(fn ($r) => ['name' => $r->name, 'views' => (int) $r->views]);

        $devices = $inRange()
            ->selectRaw('device, COUNT(*) as views')
            ->groupBy('device')
            ->pluck('views', 'device');

        return response()->json([
            'range' => $range,
            'generatedAt' => now()->toIso8601String(),
            'totals' => [
                'today' => $sum(1),
                'last7' => $sum(7),
                'last30' => $sum(30),
                'allTime' => [
                    'views' => PageView::count(),
                    'since' => PageView::min('visited_on') ? substr((string) PageView::min('visited_on'), 0, 10) : null,
                ],
            ],
            'daily' => $daily,
            'monthly' => array_values($monthly),
            'pages' => $pages->map(function ($p) use ($titles) {
                $id = $this->initiativeId($p->path);

                return [
                    'path' => $p->path,
                    'title' => $id ? ($titles[$id] ?? null) : null,
                    'views' => (int) $p->views,
                    'visitors' => (int) $p->visitors,
                ];
            })->values(),
            'sources' => $sources,
            'devices' => ['mobile' => (int) ($devices['mobile'] ?? 0), 'desktop' => (int) ($devices['desktop'] ?? 0)],
        ]);
    }

    private function initiativeId(string $path): ?string
    {
        return preg_match('#^/inicijative/([0-9A-Za-z]{26})$#', $path, $m) ? $m[1] : null;
    }
}
