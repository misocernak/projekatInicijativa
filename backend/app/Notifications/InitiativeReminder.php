<?php

namespace App\Notifications;

use App\Models\Participation;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Podsetnik volonteru oko dan pre početka inicijative. */
class InitiativeReminder extends Notification
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

        $start = $initiative->starts_at->copy()->setTimezone('Europe/Belgrade');
        $when = $start->format('d.m.Y.').' u '.$start->format('H:i');

        $message = (new MailMessage)
            ->subject('Podsetnik: '.$initiative->title)
            ->greeting('Zdravo, '.$notifiable->name.'!')
            ->line('Podsećamo te da se uskoro održava inicijativa na koju si prijavljen/a: „'.$initiative->title.'“.')
            ->line('**Kada:** '.$when)
            ->line('**Gde:** '.$initiative->city->name.', '.$initiative->address);

        if ($initiative->bring) {
            $message->line('**Šta poneti:** '.$initiative->bring);
        }

        return $message
            ->action('Pogledaj inicijativu', rtrim(config('app.url'), '/').'/inicijative/'.$initiative->id)
            ->line('Ako ne možeš da dođeš, odjavi se na stranici inicijative da bi se oslobodilo mesto.')
            ->salutation('Lepša Srbija');
    }
}
