<?php

namespace App\Notifications;

use App\Models\Initiative;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class InitiativeHidden extends Notification
{
    public function __construct(public Initiative $initiative) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Inicijativa je uklonjena sa javne liste')
            ->greeting('Zdravo, '.$notifiable->name.'!')
            ->line('Tvoja inicijativa „'.$this->initiative->title.'“ trenutno nije vidljiva javnosti, jer je pregledom utvrđeno da možda krši pravila ponašanja.')
            ->line('Ako smatraš da je u pitanju greška, odgovori na ovu poruku ili nam se javi, pa ćemo je ponovo pregledati.')
            ->action('Pravila ponašanja', rtrim(config('app.url'), '/').'/o-projektu')
            ->salutation('Zajedno');
    }
}
