<?php

namespace App\Notifications;

use App\Models\Report;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Admin dobija mejl čim neko prijavi sadržaj. */
class ReportReceived extends Notification
{
    public function __construct(public Report $report) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $initiative = $this->report->initiative;

        $message = (new MailMessage)
            ->subject('Prijava sadržaja: '.$initiative->title)
            ->greeting('Nova prijava sadržaja')
            ->line('**Akcija:** '.$initiative->title)
            ->line('**Razlog:** '.$this->report->reason);

        if ($this->report->message) {
            $message->line('**Poruka:** '.$this->report->message);
        }

        return $message
            ->action('Otvori admin stranicu', rtrim(config('app.url'), '/').'/admin')
            ->salutation('Lepša Srbija');
    }
}
