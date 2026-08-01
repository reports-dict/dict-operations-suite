<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('drivers', function (Blueprint $table) {
            $table->id();
            $table->string('employee_id')->unique(); // BigQuery EmployeeID - stable link key
            $table->string('full_name');
            $table->string('designation')->default('Prime Mover Driver');
            $table->boolean('is_active')->default(true); // false once dropped from the masterlist - never hard-deleted
            $table->boolean('on_duty')->default(false);
            $table->dateTime('on_duty_since')->nullable();
            $table->dateTime('last_masterlist_synced_at')->nullable();
            $table->dateTime('last_attendance_synced_at')->nullable();
            $table->timestamps();

            $table->index('on_duty');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('drivers');
    }
};
