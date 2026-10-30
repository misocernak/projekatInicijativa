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
            ->subject('Otkazana akcija: '.$this->initiative->title)
            ->greeting('Zdravo, '.$notifiable->name.'!')
            ->line('Nažalost, organizator je otkazao akciju „'.$this->initiative->title.'“ na koju si se prijavio/la.')
            ->line('Hvala ti na volji da pomogneš. Pogledaj druge akcije u svom gradu, možda te neka zanima.')
            ->action('Pogledaj akcije', rtrim(config('app.url'), '/').'/inicijative')
            ->salutation('Lepša Srbija');
    }
}
