<?php

namespace App\Providers;

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Indeksirane kolone (npr. email) staju u ograničenje ključa i na starijim MySQL/MariaDB serverima.
        Schema::defaultStringLength(191);
    }
}
