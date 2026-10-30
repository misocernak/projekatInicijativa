<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Obaveštenje kada neko dobije ili izgubi admin ulogu. */
class RoleChanged extends Notification
{
    public function __construct(public string $role, public User $by) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $granted = $this->role === 'admin';

        $message = (new MailMessage)
            ->subject($granted ? 'Postao/la si admin' : 'Admin uloga je skinuta')
            ->greeting('Zdravo, '.$notifiable->name.'!');

        if ($granted) {
            $message->line($this->by->name.' ti je dodelio/la admin ulogu na sajtu Lepša Srbija.')
                ->line('Sada možeš da vidiš statistiku, pregledaš prijave sadržaja i sakrivaš sporne akcije.')
                ->action('Otvori admin stranicu', rtrim(config('app.url'), '/').'/admin');
        } else {
            $message->line('Admin uloga na tvom nalogu na sajtu Lepša Srbija je skinuta. Nalog i dalje radi kao i do sada.');
        }

        return $message->salutation('Lepša Srbija');
    }
}
