<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

/**
 * Admin se postavlja samo ovde (na serveru), nikad preko API-ja:
 *   php artisan user:admin ime@primer.rs
 *   php artisan user:admin ime@primer.rs --revoke
 */
class MakeAdmin extends Command
{
    protected $signature = 'user:admin {email : Mejl adrese postojećeg naloga} {--revoke : Skida admin ulogu}';

    protected $description = 'Postavlja (ili skida) admin ulogu postojećem nalogu';

    public function handle(): int
    {
        $user = User::where('email', Str::lower($this->argument('email')))->first();

        if (! $user) {
            $this->error('Nalog sa tom mejl adresom ne postoji. Prvo se registruj na sajtu.');

            return self::FAILURE;
        }

        $revoke = (bool) $this->option('revoke');
        $user->forceFill(['role' => $revoke ? 'user' : 'admin'])->save();

        $this->info($revoke
            ? "{$user->email} više nije admin."
            : "{$user->email} je sada admin.");

        return self::SUCCESS;
    }
}
