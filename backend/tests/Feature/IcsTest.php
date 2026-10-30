<?php

namespace Tests\Feature;

use App\Models\Initiative;
use App\Support\Ics;
use Tests\TestCase;

class IcsTest extends TestCase
{
    private function initiative(array $attrs = []): Initiative
    {
        $initiative = new Initiative(array_merge([
            'title' => 'Sadnja drveća, park; test',
            'description' => 'Prvi red'."\n".'Drugi red',
            'address' => 'Ulica 1, Niš',
            'kind' => 'timed',
            'starts_at' => '2026-11-07 09:00:00',
            'ends_at' => '2026-11-07 12:00:00',
        ], $attrs));
        $initiative->id = '01TESTID';

        return $initiative;
    }

    public function test_builds_a_valid_event_for_timed_initiatives(): void
    {
        $ics = Ics::forInitiative($this->initiative());

        $this->assertStringStartsWith('BEGIN:VCALENDAR', $ics);
        $this->assertStringContainsString('BEGIN:VEVENT', $ics);
        $this->assertStringContainsString('UID:01TESTID@lepsasrbija.com', $ics);
        $this->assertStringContainsString('DTSTART:20261107T090000Z', $ics);
        $this->assertStringContainsString('DTEND:20261107T120000Z', $ics);
        $this->assertStringEndsWith("END:VCALENDAR\r\n", $ics);
    }

    public function test_escapes_special_characters(): void
    {
        $bs = chr(92);
        $ics = Ics::forInitiative($this->initiative());

        $this->assertStringContainsString('SUMMARY:Sadnja drveća'.$bs.', park'.$bs.'; test', $ics);
        $this->assertStringContainsString('Prvi red'.$bs.'nDrugi red', $ics);
    }

    public function test_long_lines_are_folded_to_75_bytes(): void
    {
        $ics = Ics::forInitiative($this->initiative(['description' => str_repeat('Čišćenje parka. ', 40)]));

        foreach (explode("\r\n", $ics) as $line) {
            $this->assertLessThanOrEqual(75, strlen($line));
        }
    }

    public function test_permanent_initiatives_have_no_calendar_event(): void
    {
        $this->assertNull(Ics::forInitiative($this->initiative(['kind' => 'permanent', 'starts_at' => null, 'ends_at' => null])));
    }
}
