<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * road_queue_ecd_tat_history is an app-owned table on the default mysql
 * connection (unlike Vessel Schedule's tables) - no manual-only production
 * migration needed, this runs via the normal `php artisan migrate`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('road_queue_ecd_tat_history', function (Blueprint $table) {
            $table->unsignedInteger('container_count')->nullable()->after('avg_tat_seconds');
        });
    }

    public function down(): void
    {
        Schema::table('road_queue_ecd_tat_history', function (Blueprint $table) {
            $table->dropColumn('container_count');
        });
    }
};
