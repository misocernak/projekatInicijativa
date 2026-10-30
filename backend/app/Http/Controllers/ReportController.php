<?php

namespace App\Http\Controllers;

use App\Models\Initiative;
use App\Models\Report;
use App\Models\User;
use App\Notifications\ReportReceived;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Prijava neprikladnog sadržaja. Može i bez naloga (uz opcioni mejl za povratnu informaciju).
 */
class ReportController extends Controller
{
    public function store(Request $request, Initiative $initiative): JsonResponse
    {
        // sakrivena akcija za javnost ne postoji
        abort_if($initiative->isHidden(), 404);

        $data = $request->validate([
            'reason' => ['required', 'in:'.implode(',', Report::REASONS)],
            'message' => ['nullable', 'string', 'max:1000'],
            'email' => ['nullable', 'email', 'max:190'],
        ], [
            'reason.required' => 'Izaberi razlog prijave.',
            'reason.in' => 'Nepoznat razlog prijave.',
        ]);

        $user = $request->user();

        // ista osoba ne mora da prijavljuje isto više puta
        if ($user && Report::where('initiative_id', $initiative->id)->where('user_id', $user->id)->where('status', 'open')->exists()) {
            return response()->json(['status' => 'ok']);
        }

        $report = Report::create([
            'initiative_id' => $initiative->id,
            'user_id' => $user?->id,
            'reporter_email' => $user ? null : ($data['email'] ?? null),
            'reason' => $data['reason'],
            'message' => $data['message'] ?? null,
        ]);

        $this->notifyAdmins($report);

        return response()->json(['status' => 'ok'], 201);
    }

    private function notifyAdmins(Report $report): void
    {
        User::where('role', 'admin')->each(function (User $admin) use ($report) {
            try {
                $admin->notify(new ReportReceived($report));
            } catch (Throwable $e) {
                Log::error('Obaveštenje adminu o prijavi nije poslato: '.$e->getMessage());
            }
        });
    }
}
