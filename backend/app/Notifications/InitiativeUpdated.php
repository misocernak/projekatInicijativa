<?php

namespace App\Notifications;

use App\Models\Initiative;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Šalje se prijavljenima kada organizator promeni vreme ili mesto.
 */
class InitiativeUpdated extends Notification
{
    public function __construct(public Initiative $initiative) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $initiative = $this->initiative;
        $initiative->loadMissing('city');
        $tz = 'Europe/Belgrade';

        $message = (new MailMessage)
            ->subject('Izmena: '.$initiative->title)
            ->greeting('Zdravo, '.$notifiable->name.'!')
            ->line('Organizator je promenio detalje inicijative „'.$initiative->title.'“ na koju si se prijavio/la. Novi podaci:');

        if ($initiative->starts_at) {
            $start = $initiative->starts_at->copy()->setTimezone($tz);
            $when = $start->format('d.m.Y.').' u '.$start->format('H:i');
            if ($initiative->ends_at) {
                $when .= ' do '.$initiative->ends_at->copy()->setTimezone($tz)->format('H:i');
            }
            $message->line('**Kada:** '.$when);
        }

        $message->line('**Gde:** '.$initiative->city->name.', '.$initiative->address)
            ->action('Pogledaj inicijativu', rtrim(config('app.url'), '/').'/inicijative/'.$initiative->id)
            ->line('Ako ti novi termin ne odgovara, možeš da se odjaviš na stranici inicijative.')
            ->salutation('Zajedno');

        return $message;
    }
}
