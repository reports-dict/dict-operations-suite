<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * MANUAL-ONLY migration - lives outside database/migrations on purpose, so
 * Laravel's default migration discovery never picks it up. `php artisan
 * migrate` (locally or in any automated deploy step) will NOT run this file.
 *
 * Run once, by hand, on the production server against the real
 * vessel_dashboard connection (config/database.php - VESSEL_DB_HOST):
 *
 *   php artisan migrate --path=database/migrations-vessel-dashboard --database=vessel_dashboard
 *
 * Schema must stay identical to
 * database/migrations/2026_09_01_100000_create_vessel_schedules_table.php.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('vessel_dashboard')->create('vessel_schedules', function (Blueprint $table) {
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
        Schema::connection('vessel_dashboard')->dropIfExists('vessel_schedules');
    }
};
