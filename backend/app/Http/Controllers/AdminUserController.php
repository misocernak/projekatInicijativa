<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Notifications\RoleChanged;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Pregled naloga i dodela admin uloge. Rute su iza `can:admin`.
 */
class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'role' => ['nullable', 'in:admin,user'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $page = User::query()
            ->withCount([
                'initiatives',
                'participations as confirmed_count' => fn ($q) => $q->where('status', 'confirmed'),
            ])
            ->when($filters['q'] ?? null, function ($query, $text) {
                // % i _ se tretiraju kao obični znakovi
                $like = '%'.addcslashes($text, '%_'.chr(92)).'%';

                return $query->where(fn ($w) => $w->where('name', 'like', $like)->orWhere('email', 'like', $like));
            })
            ->when($filters['role'] ?? null, fn ($query, $role) => $query->where('role', $role))
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate(25);

        return response()->json([
            'data' => $page->getCollection()->map(fn (User $u) => $this->payload($u))->values(),
            'meta' => [
                'page' => $page->currentPage(),
                'lastPage' => $page->lastPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    /** Postavlja ili skida admin ulogu. */
    public function setRole(Request $request, User $user): JsonResponse
    {
        $data = $request->validate(['role' => ['required', 'in:user,admin']]);

        // da admin ne ostane bez pristupa greškom (i da bar jedan admin uvek postoji)
        abort_if($user->is($request->user()), 422, 'Ne možeš da menjaš sopstvenu ulogu. Zamoli drugog admina.');

        if ($data['role'] === 'admin') {
            abort_unless($user->hasVerifiedEmail(), 422, 'Admin može da bude samo nalog sa potvrđenom mejl adresom.');
        }

        if ($user->role !== $data['role']) {
            $user->forceFill(['role' => $data['role']])->save();

            Log::info('Promena uloge', [
                'by' => $request->user()->email,
                'target' => $user->email,
                'role' => $data['role'],
            ]);

            try {
                $user->notify(new RoleChanged($data['role'], $request->user()));
            } catch (Throwable $e) {
                Log::error('Obaveštenje o promeni uloge nije poslato: '.$e->getMessage());
            }
        }

        return response()->json(['user' => $this->payload($user)]);
    }

    /** @return array<string, mixed> */
    private function payload(User $user): array
    {
        return [
            'id' => (string) $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role ?? 'user',
            'emailVerified' => $user->hasVerifiedEmail(),
            // false za naloge nastale brzom prijavom na inicijativu
            'hasPassword' => $user->password !== null,
            'createdAt' => $user->created_at?->toIso8601String(),
            'initiatives' => (int) ($user->initiatives_count ?? 0),
            'participations' => (int) ($user->confirmed_count ?? 0),
        ];
    }
}
