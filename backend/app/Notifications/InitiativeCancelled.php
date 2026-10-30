<?php

namespace App\Notifications;

use App\Models\Initiative;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class InitiativeCancelled extends Notification
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
            ->subject('Otkazana inicijativa: '.$this->initiative->title)
            ->greeting('Zdravo, '.$notifiable->name.'!')
            ->line('Nažalost, organizator je otkazao inicijativu „'.$this->initiative->title.'“ na koju si se prijavio/la.')
            ->line('Hvala ti na volji da pomogneš. Pogledaj druge inicijative u svom gradu, možda te neka zanima.')
            ->action('Pogledaj inicijative', rtrim(config('app.url'), '/').'/inicijative')
            ->salutation('Lepša Srbija');
    }
}
