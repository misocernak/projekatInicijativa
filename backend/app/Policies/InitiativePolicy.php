<?php

namespace App\Policies;

use App\Models\Initiative;
use App\Models\User;

/**
 * Akcijom upravlja organizator (ili admin). Ime klase prati model, pa Laravel sam pronalazi policy.
 */
class InitiativePolicy
{
    public function update(User $user, Initiative $initiative): bool
    {
        return $this->manages($user, $initiative);
    }

    public function cancel(User $user, Initiative $initiative): bool
    {
        return $this->manages($user, $initiative);
    }

    public function viewParticipants(User $user, Initiative $initiative): bool
    {
        return $this->manages($user, $initiative);
    }

    private function manages(User $user, Initiative $initiative): bool
    {
        return (int) $user->id === (int) $initiative->user_id || $user->isAdmin();
    }
}
