<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Sync health log for ContainerYardSyncService, queried directly by the
     * Management page - modeled on vessel_sync_logs (see
     * database/migrations/2026_07_31_100002_create_vessel_sync_logs_table.php)
     * but with the source app's own sync-status shape (status/message/count)
     * plus a trigger discriminator, replacing its dropped Redis
     * `Cache::put('sync:status', ...)` call.
     */
    public function up(): void
    {
        Schema::create('yard_sync_logs', function (Blueprint $table) {
            $table->id();
            $table->timestamp('ran_at');
            $table->enum('status', ['success', 'error']);
            $table->text('message')->nullable();
            $table->integer('count')->default(0);
            $table->enum('trigger', ['scheduled', 'manual'])->default('scheduled');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('yard_sync_logs');
    }
};
