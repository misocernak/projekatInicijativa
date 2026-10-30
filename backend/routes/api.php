<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\InitiativeController;
use App\Http\Controllers\ReferenceController;
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

// Javno čitanje
Route::get('/cities', [ReferenceController::class, 'cities']);
Route::get('/categories', [ReferenceController::class, 'categories']);
Route::get('/initiatives', [InitiativeController::class, 'index']);
Route::get('/initiatives/{initiative}', [InitiativeController::class, 'show']);

// Nalog
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:10,1');
Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
    ->middleware(['signed', 'throttle:20,1'])
    ->name('verification.verify');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/email/verification-notification', [AuthController::class, 'resendVerification'])
        ->middleware('throttle:3,1');
});
