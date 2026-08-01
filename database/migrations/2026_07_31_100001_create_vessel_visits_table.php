<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vessel_visits', function (Blueprint $table) {
            $table->id();
            $table->string('ob_ib_id')->unique();
            $table->string('vessel_name');
            $table->string('service');
            $table->string('vessel_id');
            $table->string('phase');
            $table->string('line_op');
            $table->integer('total_planned_loading_wi')->default(0);
            $table->integer('load_plan_fcl_20ft')->default(0);
            $table->integer('load_plan_fcl_40ft')->default(0);
            $table->integer('load_plan_empty_20ft')->default(0);
            $table->integer('load_plan_empty_40ft')->default(0);
            $table->integer('total_loaded_count')->default(0);
            $table->integer('loaded_fcl_20ft')->default(0);
            $table->integer('loaded_fcl_40ft')->default(0);
            $table->integer('loaded_empty_20ft')->default(0);
            $table->integer('loaded_empty_40ft')->default(0);
            $table->integer('total_planned_discharge')->default(0);
            $table->integer('discharge_plan_fcl_20ft')->default(0);
            $table->integer('discharge_plan_fcl_40ft')->default(0);
            $table->integer('discharge_plan_mty_20ft')->default(0);
            $table->integer('discharge_plan_mty_40ft')->default(0);
            $table->integer('total_discharged_count')->default(0);
            $table->integer('discharged_fcl_20ft')->default(0);
            $table->integer('discharged_fcl_40ft')->default(0);
            $table->integer('discharged_empty_20ft')->default(0);
            $table->integer('discharged_empty_40ft')->default(0);
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vessel_visits');
    }
};
