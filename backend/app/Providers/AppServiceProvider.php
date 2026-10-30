<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\URL;
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

        // Ulazna tačka je u public_html/api, a linkovi generisani van zahteva (red, cron) nemaju /api.
        // Potpisani linkovi iz mejlova moraju da imaju isti koren kao zahtev koji ih proverava.
        if ($this->app->isProduction()) {
            URL::forceScheme('https');
            URL::forceRootUrl(rtrim(config('app.url'), '/').'/api');
        }

        // Moderacija: samo admin
        Gate::define('admin', fn (User $user) => $user->isAdmin());

        $this->configureMails();
    }

    /** Mejlovi za potvrdu adrese i reset lozinke, na srpskom, sa linkovima koji vode na front. */
    private function configureMails(): void
    {
        VerifyEmail::toMailUsing(function (object $notifiable, string $url) {
            return (new MailMessage)
                ->subject('Potvrdi svoju mejl adresu')
                ->greeting('Zdravo, '.$notifiable->name.'!')
                ->line('Hvala što si se pridružio/la zajednici. Potvrdi mejl adresu da bi mogao/la da pokrećeš akcije.')
                ->action('Potvrdi mejl adresu', $url)
                ->line('Link važi 60 minuta. Ako nisi ti napravio/la nalog, slobodno ignoriši ovu poruku.')
                ->salutation('Lepša Srbija');
        });

        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            return rtrim(config('app.url'), '/').'/nova-lozinka?token='.$token
                .'&email='.urlencode($notifiable->getEmailForPasswordReset());
        });

        ResetPassword::toMailUsing(function (object $notifiable, string $token) {
            $url = rtrim(config('app.url'), '/').'/nova-lozinka?token='.$token
                .'&email='.urlencode($notifiable->getEmailForPasswordReset());

            // nalog nastao brzom prijavom na akciju još nema lozinku: ovo je njegova aktivacija
            if ($notifiable->password === null) {
                return (new MailMessage)
                    ->subject('Aktiviraj svoj nalog')
                    ->greeting('Zdravo, '.$notifiable->name.'!')
                    ->line('Ranije si se prijavio/la na akciju samo mejl adresom, pa nalog još nema lozinku.')
                    ->line('Postavi lozinku da završiš registraciju. Posle toga možeš da se prijaviš, pratiš svoje prijave i pokrećeš sopstvene akcije.')
                    ->action('Postavi lozinku', $url)
                    ->line('Link važi 60 minuta. Ako nisi ti tražio/la ovo, slobodno ignoriši poruku; tvoje prijave ostaju kakve jesu.')
                    ->salutation('Lepša Srbija');
            }

            return (new MailMessage)
                ->subject('Nova lozinka')
                ->greeting('Zdravo, '.$notifiable->name.'!')
                ->line('Dobili smo zahtev da postaviš novu lozinku za svoj nalog.')
                ->action('Postavi novu lozinku', $url)
                ->line('Link važi 60 minuta. Ako nisi ti tražio/la promenu, ne moraš ništa da radiš.')
                ->salutation('Lepša Srbija');
        });
    }
}
