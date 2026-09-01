<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * MANUAL-ONLY migration - lives outside database/migrations on purpose, see
 * 2026_09_01_100000_create_vessel_schedules_table.php in this same
 * directory. Run once, by hand, on the production server alongside the
 * other pending migrations in this directory:
 *
 *   php artisan migrate --path=database/migrations-vessel-dashboard --database=vessel_dashboard
 *
 * Schema must stay identical to
 * database/migrations/2026_09_02_100000_add_berth_number_to_vessel_schedules_table.php.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('vessel_dashboard')->table('vessel_schedules', function (Blueprint $table) {
            $table->string('berth_number')->nullable()->after('loa_meters');
        });
    }

    public function down(): void
    {
        Schema::connection('vessel_dashboard')->table('vessel_schedules', function (Blueprint $table) {
            $table->dropColumn('berth_number');
        });
    }
};
