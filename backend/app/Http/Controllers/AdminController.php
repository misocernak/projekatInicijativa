<?php

namespace App\Http\Controllers;

use App\Models\Initiative;
use App\Models\Report;
use App\Notifications\InitiativeHidden;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Moderacija. Rute su iza `can:admin`.
 */
class AdminController extends Controller
{
    public function reports(Request $request): JsonResponse
    {
        $status = $request->query('status', 'open');

        $rows = Report::query()
            ->with(['initiative:id,title,hidden_at,user_id', 'initiative.organizer:id,name', 'user:id,name,email'])
            ->when($status !== 'all', fn ($q) => $q->where('status', $status === 'resolved' ? 'resolved' : 'open'))
            ->orderByDesc('created_at')
            ->limit(200)
            ->get()
            ->map(fn (Report $r) => [
                'id' => $r->id,
                'reason' => $r->reason,
                'message' => $r->message,
                'status' => $r->status,
                'createdAt' => $r->created_at->toIso8601String(),
                'reporter' => $r->user
                    ? ['name' => $r->user->name, 'email' => $r->user->email]
                    : ($r->reporter_email ? ['name' => null, 'email' => $r->reporter_email] : null),
                'initiative' => [
                    'id' => $r->initiative->id,
                    'title' => $r->initiative->title,
                    'hidden' => $r->initiative->isHidden(),
                    'organizerName' => $r->initiative->organizer->name,
                ],
            ]);

        return response()->json(['data' => $rows->values()]);
    }

    public function resolve(Request $request, Report $report): JsonResponse
    {
        $report->forceFill([
            'status' => 'resolved',
            'handled_by' => $request->user()->id,
            'handled_at' => now(),
        ])->save();

        return response()->json(['status' => 'resolved']);
    }

    /** Sakriva inicijativu sa javne liste, zatvara njene otvorene prijave i obaveštava organizatora. */
    public function hide(Request $request, Initiative $initiative): JsonResponse
    {
        if (! $initiative->isHidden()) {
            $initiative->forceFill(['hidden_at' => now()])->save();

            $initiative->reports()->where('status', 'open')->update([
                'status' => 'resolved',
                'handled_by' => $request->user()->id,
                'handled_at' => now(),
            ]);

            try {
                $initiative->organizer->notify(new InitiativeHidden($initiative));
            } catch (Throwable $e) {
                Log::error('Obaveštenje organizatoru o sakrivanju nije poslato: '.$e->getMessage());
            }
        }

        return response()->json(['status' => 'hidden']);
    }

    public function unhide(Initiative $initiative): JsonResponse
    {
        $initiative->forceFill(['hidden_at' => null])->save();

        return response()->json(['status' => 'visible']);
    }
}
