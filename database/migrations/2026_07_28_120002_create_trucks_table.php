<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('trucks', function (Blueprint $table) {
            $table->id();
            $table->string('truck_number');
            $table->timestamps();
            // Soft-deletes, not decorative: truck_assignments FKs to this
            // table with restrictOnDelete(), so a truck with assignment
            // history can never be hard-deleted without destroying that
            // history. Uniqueness of truck_number among non-trashed rows
            // is enforced at the validation layer (MySQL can't express a
            // partial unique index natively).
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('trucks');
    }
};
