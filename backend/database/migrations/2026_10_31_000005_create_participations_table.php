<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('participations', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('initiative_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            // pending = čeka potvrdu mejla, confirmed = računa se, cancelled = odjavljen
            $table->string('status', 12)->default('pending');
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();

            $table->unique(['initiative_id', 'user_id']);
            $table->index(['initiative_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('participations');
    }
};
