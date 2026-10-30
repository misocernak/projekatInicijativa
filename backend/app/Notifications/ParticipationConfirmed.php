<?php

namespace App\Notifications;

use App\Models\Participation;
use App\Support\Ics;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

/**
 * Potvrda prijave sa svim detaljima, kalendarom (.ics) i linkom za odjavu.
 */
class ParticipationConfirmed extends Notification
{
    public function __construct(public Participation $participation) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $initiative = $this->participation->initiative;
        $initiative->loadMissing('city');

        $front = rtrim(config('app.url'), '/').'/inicijative/'.$initiative->id;
        $cancelUrl = URL::temporarySignedRoute('participation.cancel', now()->addDays(120), [
            'participation' => $this->participation->id,
        ]);

        $message = (new MailMessage)
            ->subject('Prijava potvrđena: '.$initiative->title)
            ->greeting('Vidimo se, '.$notifiable->name.'!')
            ->line('Tvoja prijava za inicijativu „'.$initiative->title.'“ je potvrđena.')
            ->line('**Kada:** '.$this->when($initiative))
            ->line('**Gde:** '.$initiative->city->name.', '.$initiative->address);

        if ($initiative->bring) {
            $message->line('**Šta poneti:** '.$initiative->bring);
        }

        if ($initiative->contact) {
            $message->line('**Kontakt organizatora:** '.$initiative->contact);
        }

        $message->action('Pogledaj inicijativu', $front)
            ->line('Ako ne možeš da dođeš, odjavi se da bi se oslobodilo mesto: '.$cancelUrl);

        // prijava bez naloga: objasni kako da dobije pravi nalog
        if ($notifiable->password === null) {
            $message->line('Prijavio/la si se bez naloga. Ako želiš da pratiš svoje prijave i da pokreneš sopstvenu inicijativu, otvori '
                .rtrim(config('app.url'), '/').'/prijava, izaberi „Registruj se“ sa ovom mejl adresom i poslaćemo ti link da postaviš lozinku.');
        }

        $message->salutation('Lepša Srbija');

        if ($ics = Ics::forInitiative($initiative)) {
            $message->attachData($ics, 'inicijativa.ics', ['mime' => 'text/calendar']);
        }

        return $message;
    }

    private function when($initiative): string
    {
        if ($initiative->kind === 'permanent' || ! $initiative->starts_at) {
            return 'trajna inicijativa, priključi se u bilo kom trenutku';
        }

        $tz = 'Europe/Belgrade';
        $start = $initiative->starts_at->copy()->setTimezone($tz);
        $text = $start->format('d.m.Y.').' u '.$start->format('H:i');

        if ($initiative->ends_at) {
            $text .= ' do '.$initiative->ends_at->copy()->setTimezone($tz)->format('H:i');
        }

        return $text;
    }
}
