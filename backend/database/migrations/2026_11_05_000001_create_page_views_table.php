<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Samo nova tabela: postojeće tabele i podaci se ne diraju. */
    public function up(): void
    {
        // Poseta stranici, bez kolačića i bez IP adrese. "visitor" je dnevni anonimni otisak (menja se svaki dan),
        // pa se zna koliko je različitih posetilaca bilo tog dana, ali ne i ko su.
        Schema::create('page_views', function (Blueprint $table) {
            $table->id();
            $table->date('visited_on');
            $table->string('path', 120);
            $table->string('visitor', 16);
            $table->string('source', 60)->nullable();
            $table->string('device', 10)->default('desktop');
            $table->timestamp('created_at')->useCurrent();

            $table->index(['visited_on', 'path']);
            $table->index(['visited_on', 'visitor']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('page_views');
    }
};
