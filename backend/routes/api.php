<?php

use App\Http\Controllers\InitiativeController;
use App\Http\Controllers\ReferenceController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

/*
 * Javna provera da API radi i da vidi bazu. Ne otkriva detalje greške.
 */
Route::get('/health', function () {
    try {
        DB::select('select 1');
        $db = true;
    } catch (Throwable) {
        $db = false;
    }

    return response()->json([
        'status' => $db ? 'ok' : 'degraded',
        'database' => $db,
        'time' => now()->toIso8601String(),
    ], $db ? 200 : 503);
});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Javno čitanje
Route::get('/cities', [ReferenceController::class, 'cities']);
Route::get('/categories', [ReferenceController::class, 'categories']);
Route::get('/initiatives', [InitiativeController::class, 'index']);
Route::get('/initiatives/{initiative}', [InitiativeController::class, 'show']);
