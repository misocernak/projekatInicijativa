<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\AdminStatsController;
use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\InitiativeController;
use App\Http\Controllers\MeController;
use App\Http\Controllers\ParticipationController;
use App\Http\Controllers\ReferenceController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ResultController;
use App\Http\Controllers\SeoController;
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
Route::get('/results', [ResultController::class, 'index']);

// Meta podaci za botove (deljenje na mrežama, pretraga); .htaccess na frontu im šalje zahteve ovamo
Route::get('/seo', SeoController::class);

// Prijava neprikladnog sadržaja (i bez naloga)
Route::post('/initiatives/{initiative}/report', [ReportController::class, 'store'])->middleware(['throttle:5,60', 'turnstile:guests']);

// Prijava na inicijativu: gost (ime + mejl) ili prijavljen korisnik
Route::post('/initiatives/{initiative}/join', [ParticipationController::class, 'join'])->middleware(['throttle:20,1', 'turnstile:guests']);

// Linkovi iz mejlova (potpisani)
Route::get('/participations/{participation}/confirm', [ParticipationController::class, 'confirm'])
    ->middleware(['signed', 'throttle:30,1'])
    ->name('participation.confirm');
Route::get('/participations/{participation}/cancel', [ParticipationController::class, 'cancelByLink'])
    ->middleware(['signed', 'throttle:30,1'])
    ->name('participation.cancel');

// Koji načini prijave su podešeni (front prikazuje dugme tek kada je Google podešen)
Route::get('/auth/providers', fn () => response()->json([
    'google' => filled(config('services.google.client_id')) && filled(config('services.google.client_secret')),
    // javni ključ za Turnstile widget; bez tajnog ključa provera na serveru je isključena, pa se widget ne prikazuje
    'turnstile' => filled(config('services.turnstile.secret')) ? config('services.turnstile.site_key') : null,
]));

// Nalog
Route::post('/register', [AuthController::class, 'register'])->middleware(['throttle:10,1', 'turnstile']);
Route::post('/login', [AuthController::class, 'login'])->middleware(['throttle:10,1', 'turnstile']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware(['throttle:5,1', 'turnstile']);
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:10,1');
Route::get('/email/verify/{id}/{hash}', [AuthController::class, 'verifyEmail'])
    ->middleware(['signed', 'throttle:20,1'])
    ->name('verification.verify');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/email/verification-notification', [AuthController::class, 'resendVerification'])
        ->middleware('throttle:3,1');

    Route::get('/me/initiatives', [MeController::class, 'initiatives']);
    Route::get('/me/participations', [MeController::class, 'participations']);

    Route::delete('/initiatives/{initiative}/join', [ParticipationController::class, 'leave']);
    Route::get('/initiatives/{initiative}/participants', [InitiativeController::class, 'participants']);

    // Moderacija
    Route::middleware('can:admin')->prefix('admin')->group(function () {
        Route::get('/stats', AdminStatsController::class);
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::post('/users/{user}/role', [AdminUserController::class, 'setRole']);
        Route::post('/users/{user}/password-link', [AdminUserController::class, 'sendPasswordLink'])->middleware('throttle:20,1');
        Route::get('/reports', [AdminController::class, 'reports']);
        Route::post('/reports/{report}/resolve', [AdminController::class, 'resolve']);
        Route::delete('/initiatives/{initiative}', [AdminController::class, 'destroy']);
        Route::post('/initiatives/{initiative}/hide', [AdminController::class, 'hide']);
        Route::post('/initiatives/{initiative}/unhide', [AdminController::class, 'unhide']);
    });

    // Upravljanje inicijativama traži potvrđenu mejl adresu
    Route::middleware('verified')->group(function () {
        Route::post('/initiatives', [InitiativeController::class, 'store'])->middleware('throttle:20,60');
        Route::put('/initiatives/{initiative}', [InitiativeController::class, 'update']);
        Route::post('/initiatives/{initiative}/cancel', [InitiativeController::class, 'cancel']);
        Route::post('/initiatives/{initiative}/image', [InitiativeController::class, 'uploadImage'])->middleware('throttle:30,60');
        Route::delete('/initiatives/{initiative}/image', [InitiativeController::class, 'deleteImage']);
        Route::post('/initiatives/{initiative}/result', [ResultController::class, 'store'])->middleware('throttle:20,60');
        Route::delete('/initiatives/{initiative}/result', [ResultController::class, 'destroy']);
    });
});
