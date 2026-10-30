<?php

namespace App\Console\Commands;

use App\Models\Participation;
use App\Notifications\InitiativeReminder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Podsetnik potvrđenim volonterima kada inicijativa počinje u narednih 24 sata.
 * Pokreće se po rasporedu (svaki sat), a svaki volonter dobija najviše jedan podsetnik.
 */
class SendReminders extends Command
{
    protected $signature = 'initiatives:send-reminders';

    protected $description = 'Šalje podsetnik volonterima za inicijative koje počinju u narednih 24 sata';

    public function handle(): int
    {
        $sent = 0;

        Participation::query()
            ->where('status', Participation::CONFIRMED)
            ->whereNull('reminded_at')
            // ko se prijavio malopre, taj već ima mejl sa detaljima
            ->where('confirmed_at', '<=', now()->subHours(2))
            ->whereHas('initiative', fn ($q) => $q
                ->whereNull('cancelled_at')
                ->whereNull('hidden_at')
                ->where('kind', 'timed')
                ->whereBetween('starts_at', [now(), now()->addDay()]))
            ->with(['initiative.city', 'user'])
            ->chunkById(100, function ($participations) use (&$sent) {
                foreach ($participations as $participation) {
                    try {
                        $participation->user->notify(new InitiativeReminder($participation));
                        $participation->forceFill(['reminded_at' => now()])->save();
                        $sent++;
                    } catch (Throwable $e) {
                        // nije označeno kao poslato, pa se pokušava ponovo pri sledećem pokretanju
                        Log::error('Podsetnik nije poslat: '.$e->getMessage());
                    }
                }
            });

        $this->info("Poslato podsetnika: {$sent}");

        return self::SUCCESS;
    }
}
