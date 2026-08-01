<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('road_queue_ecd_high_elapsed_transactions', function (Blueprint $table) {
            $table->id();
            // Always empty today - the source query comments out `unit.id as
            // container` (confirmed with the user to preserve as-is, not fix).
            $table->string('container');
            $table->string('category')->nullable();
            $table->dateTime('truck_visit_entered_yard')->nullable();
            $table->string('elapsed_time')->nullable();
            $table->string('assigned_che')->nullable();
            $table->string('type_iso')->nullable();
            $table->string('ob_carrier')->nullable();
            $table->string('freight_kind')->nullable();
            $table->string('line_op')->nullable();
            $table->string('pos_slot_from')->nullable();
            $table->string('pos_slot')->nullable();
            $table->string('trucking_company')->nullable();
            $table->string('bat_nbr')->unique();
            $table->dateTime('first_captured_at');
            $table->dateTime('last_seen_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('road_queue_ecd_high_elapsed_transactions');
    }
};
