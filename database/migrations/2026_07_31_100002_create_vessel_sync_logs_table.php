<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vessel_sync_logs', function (Blueprint $table) {
            $table->id();
            $table->timestamp('ran_at');
            $table->integer('rows_fetched')->default(0);
            $table->integer('rows_upserted')->default(0);
            $table->enum('status', ['success', 'failed']);
            $table->text('error_message')->nullable();
            $table->integer('duration_ms')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vessel_sync_logs');
    }
};
