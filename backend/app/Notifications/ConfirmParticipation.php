<?php

namespace App\Notifications;

use App\Models\Participation;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

/**
 * Prva poruka pri brzoj prijavi: klik na link potvrđuje i prijavu i vlasništvo nad mejl adresom.
 */
class ConfirmParticipation extends Notification
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

        $url = URL::temporarySignedRoute('participation.confirm', now()->addDays(3), [
            'participation' => $this->participation->id,
        ]);

        return (new MailMessage)
            ->subject('Potvrdi prijavu: '.$initiative->title)
            ->greeting('Zdravo, '.$notifiable->name.'!')
            ->line('Primili smo tvoju prijavu za inicijativu „'.$initiative->title.'“.')
            ->line('Klikni na dugme da potvrdiš da dolaziš. Tek tada te računamo među prijavljene volontere.')
            ->action('Potvrdi prijavu', $url)
            ->line('Link važi 3 dana. Ako se nisi prijavio/la, slobodno ignoriši ovu poruku.')
            ->salutation('Zajedno');
    }
}
