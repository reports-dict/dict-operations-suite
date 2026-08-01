<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vessel_plan_overrides', function (Blueprint $table) {
            $table->string('ob_ib_id')->primary();
            // Discharge planned overrides
            $table->unsignedInteger('total_planned_discharge')->nullable();
            $table->unsignedInteger('discharge_plan_fcl_20ft')->nullable();
            $table->unsignedInteger('discharge_plan_fcl_40ft')->nullable();
            $table->unsignedInteger('discharge_plan_mty_20ft')->nullable();
            $table->unsignedInteger('discharge_plan_mty_40ft')->nullable();
            // Loading planned overrides
            $table->unsignedInteger('total_planned_loading_wi')->nullable();
            $table->unsignedInteger('load_plan_fcl_20ft')->nullable();
            $table->unsignedInteger('load_plan_fcl_40ft')->nullable();
            $table->unsignedInteger('load_plan_empty_20ft')->nullable();
            $table->unsignedInteger('load_plan_empty_40ft')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vessel_plan_overrides');
    }
};
