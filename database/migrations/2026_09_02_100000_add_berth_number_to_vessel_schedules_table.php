<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Standard, auto-discovered migration - see
 * 2026_09_01_100000_create_vessel_schedules_table.php for why this table's
 * migrations target whatever the default connection resolves to rather than
 * vessel_dashboard directly. The manual-only sibling migration in
 * database/migrations-vessel-dashboard/ carries the same column addition
 * for production.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vessel_schedules', function (Blueprint $table) {
            $table->string('berth_number')->nullable()->after('loa_meters');
        });
    }

    public function down(): void
    {
        Schema::table('vessel_schedules', function (Blueprint $table) {
            $table->dropColumn('berth_number');
        });
    }
};
