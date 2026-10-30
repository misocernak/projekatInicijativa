<?php

namespace App\Support;

use App\Models\Initiative;
use Carbon\CarbonInterface;

/**
 * Kalendar fajl (.ics) za vremenske inicijative, koji ide uz mejl o potvrđenoj prijavi.
 */
class Ics
{
    public static function forInitiative(Initiative $initiative): ?string
    {
        if ($initiative->kind !== 'timed' || ! $initiative->starts_at) {
            return null;
        }

        $end = $initiative->ends_at ?? $initiative->starts_at->copy()->addHours(2);

        $lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Lepsa Srbija//lepsasrbija.com//SR',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'BEGIN:VEVENT',
            'UID:'.$initiative->id.'@lepsasrbija.com',
            'DTSTAMP:'.self::utc(now()),
            'DTSTART:'.self::utc($initiative->starts_at),
            'DTEND:'.self::utc($end),
            'SUMMARY:'.self::escape($initiative->title),
            'LOCATION:'.self::escape($initiative->address),
            'DESCRIPTION:'.self::escape($initiative->description),
            'END:VEVENT',
            'END:VCALENDAR',
        ];

        return implode("\r\n", array_map([self::class, 'fold'], $lines))."\r\n";
    }

    private static function utc(CarbonInterface $date): string
    {
        $utc = $date->copy()->utc();

        return $utc->format('Ymd').'T'.$utc->format('His').'Z';
    }

    /** Zarez, tačka-zarez, kosa crta i novi redovi imaju posebno značenje u iCalendar formatu. */
    private static function escape(string $text): string
    {
        $backslash = chr(92);

        return str_replace(
            [$backslash, ';', ',', "\r\n", "\n", "\r"],
            [$backslash.$backslash, $backslash.';', $backslash.',', $backslash.'n', $backslash.'n', $backslash.'n'],
            $text,
        );
    }

    /** Linije u iCalendar fajlu ne smeju biti duže od 75 bajtova; nastavak počinje razmakom. */
    private static function fold(string $line): string
    {
        if (strlen($line) <= 74) {
            return $line;
        }

        $parts = [];
        $first = true;

        while ($line !== '') {
            $limit = $first ? 74 : 73;
            $chunk = mb_strcut($line, 0, $limit);
            $parts[] = ($first ? '' : ' ').$chunk;
            $line = substr($line, strlen($chunk));
            $first = false;
        }

        return implode("\r\n", $parts);
    }
}
