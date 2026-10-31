<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Rezultat završene akcije ("Uradili smo"): opis, slike pre i posle, i kada je objavljen.
        Schema::table('initiatives', function (Blueprint $table) {
            $table->text('result_text')->nullable();
            $table->string('result_before_path')->nullable();
            $table->string('result_after_path')->nullable();
            $table->timestamp('result_published_at')->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::table('initiatives', function (Blueprint $table) {
            $table->dropIndex(['result_published_at']);
            $table->dropColumn(['result_text', 'result_before_path', 'result_after_path', 'result_published_at']);
        });
    }
};
