<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Standard, auto-discovered migration - see
 * 2026_09_01_100000_create_vessel_schedules_table.php for why this table's
 * migrations target whatever the default connection resolves to rather than
 * vessel_dashboard directly. The manual-only sibling migration in
 * database/migrations-vessel-dashboard/ carries the same column additions
 * for production.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vessel_schedules', function (Blueprint $table) {
            $table->string('status')->default('scheduled')->after('loa_meters');
            $table->string('matched_ob_ib_id')->nullable()->after('status');
            $table->timestamp('on_dock_at')->nullable()->after('matched_ob_ib_id');
            $table->timestamp('departed_at')->nullable()->after('on_dock_at');
        });
    }

    public function down(): void
    {
        Schema::table('vessel_schedules', function (Blueprint $table) {
            $table->dropColumn(['status', 'matched_ob_ib_id', 'on_dock_at', 'departed_at']);
        });
    }
};
