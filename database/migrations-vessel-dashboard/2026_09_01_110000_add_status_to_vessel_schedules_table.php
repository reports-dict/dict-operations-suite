<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * MANUAL-ONLY migration - lives outside database/migrations on purpose, see
 * 2026_09_01_100000_create_vessel_schedules_table.php in this same
 * directory. Run once, by hand, on the production server after (or with)
 * that one:
 *
 *   php artisan migrate --path=database/migrations-vessel-dashboard --database=vessel_dashboard
 *
 * Schema must stay identical to
 * database/migrations/2026_09_01_110000_add_status_to_vessel_schedules_table.php.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('vessel_dashboard')->table('vessel_schedules', function (Blueprint $table) {
            $table->string('status')->default('scheduled')->after('loa_meters');
            $table->string('matched_ob_ib_id')->nullable()->after('status');
            $table->timestamp('on_dock_at')->nullable()->after('matched_ob_ib_id');
            $table->timestamp('departed_at')->nullable()->after('on_dock_at');
        });
    }

    public function down(): void
    {
        Schema::connection('vessel_dashboard')->table('vessel_schedules', function (Blueprint $table) {
            $table->dropColumn(['status', 'matched_ob_ib_id', 'on_dock_at', 'departed_at']);
        });
    }
};
