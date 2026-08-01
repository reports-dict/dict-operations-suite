<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('road_queue_high_elapsed_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('container');
            $table->string('category')->nullable();
            $table->dateTime('precheck_time')->nullable();
            $table->string('elapsed_time')->nullable();
            $table->string('assigned_che')->nullable();
            $table->string('type_iso')->nullable();
            $table->string('ob_carrier')->nullable();
            $table->string('freight_kind')->nullable();
            $table->string('line_op')->nullable();
            $table->string('pos_slot_from')->nullable();
            $table->string('pos_slot')->nullable();
            $table->string('bat_nbr')->unique();
            $table->dateTime('first_captured_at');
            $table->dateTime('last_seen_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('road_queue_high_elapsed_transactions');
    }
};
