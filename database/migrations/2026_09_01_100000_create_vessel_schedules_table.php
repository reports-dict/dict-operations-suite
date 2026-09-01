<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Standard, auto-discovered migration - runs via the normal `php artisan
 * migrate` against whatever the default connection resolves to (see
 * config('operations.vessel_schedule_connection') for why VesselSchedule's
 * actual runtime connection is resolved separately). This keeps local/test
 * databases schema-compatible; the real production table is created by the
 * manual-only sibling migration in database/migrations-vessel-dashboard/.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vessel_schedules', function (Blueprint $table) {
            $table->id();
            $table->string('service');
            $table->string('line_operator');
            $table->string('vessel_name');
            $table->dateTime('etb');
            $table->dateTime('etd');
            $table->unsignedInteger('estimated_moves');
            $table->decimal('loa_meters', 6, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vessel_schedules');
    }
};
