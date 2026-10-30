<?php

namespace Tests\Unit;

use App\Models\Initiative;
use PHPUnit\Framework\TestCase;

class InitiativeStatusesTest extends TestCase
{
    /** Front (frontend/src/types.ts) očekuje tačno ove statuse. */
    public function test_statuses_match_the_frontend_contract(): void
    {
        $this->assertSame(
            ['upcoming', 'ongoing', 'finished', 'permanent', 'cancelled'],
            Initiative::STATUSES,
        );
    }
}
