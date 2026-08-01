<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('road_queue_tat_history', function (Blueprint $table) {
            $table->id();
            $table->string('shift_label');
            $table->dateTime('shift_start');
            $table->dateTime('shift_end');
            $table->string('status');
            $table->string('avg_tat')->nullable();
            $table->unsignedInteger('avg_tat_seconds')->default(0);
            $table->dateTime('recorded_at');
            $table->timestamps();

            $table->unique(['shift_start', 'shift_end', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('road_queue_tat_history');
    }
};
