<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Notifications\RoleChanged;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password as PasswordBroker;
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

    /**
     * Šalje korisniku mejl sa linkom za postavljanje lozinke. Namenjeno nalozima nastalim brzom prijavom na
     * akciju (bez lozinke), ali radi za svaki nalog. Link ide na mejl adresu naloga, ne vidi ga admin.
     */
    public function sendPasswordLink(Request $request, User $user): JsonResponse
    {
        try {
            $status = PasswordBroker::sendResetLink(['email' => $user->email]);
        } catch (Throwable $e) {
            Log::error('Slanje linka za lozinku (admin) nije uspelo: '.$e->getMessage());
            abort(502, 'Slanje mejla nije uspelo. Proveri podešavanje mejla na serveru.');
        }

        abort_if($status === PasswordBroker::RESET_THROTTLED, 429, 'Link je upravo poslat. Pokušaj ponovo za minut.');

        Log::info('Admin poslao link za lozinku', ['by' => $request->user()->email, 'target' => $user->email]);

        return response()->json(['status' => 'sent']);
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
            // false za naloge nastale brzom prijavom na akciju
            'hasPassword' => $user->password !== null,
            'hasGoogle' => $user->google_id !== null,
            'createdAt' => $user->created_at?->toIso8601String(),
            'initiatives' => (int) ($user->initiatives_count ?? 0),
            'participations' => (int) ($user->confirmed_count ?? 0),
        ];
    }
}
