<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Routing\Exceptions\InvalidSignatureException;
use Throwable;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        // Na serveru ulazna tačka je u public_html/api/, pa Laravel već vidi putanje bez "/api".
        // URL-ovi koje generiše (npr. linkovi u mejlovima) i dalje imaju /api.
        apiPrefix: '',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Front je na istom domenu: prijava preko sesije (kolačić), uz CSRF zaštitu za pozive sa fronta.
        $middleware->statefulApi();
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Ovo je čist API: greške su uvek JSON (bez preusmeravanja na nepostojeću stranu za prijavu).
        $exceptions->shouldRenderJsonWhen(fn (Request $request, Throwable $e) => true);

        // Istekao ili izmenjen link iz mejla: vodi na front sa porukom, umesto na golu 403 stranu.
        $exceptions->render(function (InvalidSignatureException $e, Request $request) {
            return redirect()->away(rtrim(config('app.url'), '/').'/potvrda-mejla?status=invalid');
        });
    })->create();
