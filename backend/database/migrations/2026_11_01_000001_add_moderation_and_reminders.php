<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Sakrivena inicijativa nije vidljiva javnosti (vidi je samo organizator i admin)
        Schema::table('initiatives', function (Blueprint $table) {
            $table->timestamp('hidden_at')->nullable()->after('cancelled_at');
            $table->index('hidden_at');
        });

        // Kada je poslat podsetnik, da isti volonter ne dobije dva
        Schema::table('participations', function (Blueprint $table) {
            $table->timestamp('reminded_at')->nullable()->after('confirmed_at');
        });

        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignUlid('initiative_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('reporter_email', 190)->nullable();
            $table->string('reason', 20); // spam | neprikladno | lazno | bezbednost | drugo
            $table->text('message')->nullable();
            $table->string('status', 12)->default('open'); // open | resolved
            $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('handled_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');

        Schema::table('participations', function (Blueprint $table) {
            $table->dropColumn('reminded_at');
        });

        Schema::table('initiatives', function (Blueprint $table) {
            $table->dropIndex(['hidden_at']);
            $table->dropColumn('hidden_at');
        });
    }
};
