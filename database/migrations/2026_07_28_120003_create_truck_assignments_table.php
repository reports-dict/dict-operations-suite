<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('truck_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('truck_id')->constrained()->restrictOnDelete();
            $table->foreignId('driver_id')->constrained()->restrictOnDelete();
            $table->dateTime('assigned_at');
            $table->dateTime('ended_at')->nullable(); // null = currently active
            $table->foreignId('assigned_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('ended_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('end_reason')->nullable(); // reassigned_truck | reassigned_driver | manual_unassign | driver_deactivated
            $table->timestamps();

            $table->index(['truck_id', 'ended_at']);
            $table->index(['driver_id', 'ended_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('truck_assignments');
    }
};
