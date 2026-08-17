<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Yard block definitions (bay/row/tier geometry) - admin-managed via
     * ContainerYardManagementController. Folds local-simplified-xps-v2's
     * 3-migration `blocks` history (create + add_road_side + add_excluded_rows)
     * into one fresh create migration, since this is a new table here.
     */
    public function up(): void
    {
        Schema::create('yard_blocks', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->integer('bay_start');
            $table->integer('bay_end');
            $table->string('row_start')->default('A');
            $table->string('row_end')->default('F');
            $table->integer('max_tier')->default(5);
            $table->string('facility')->default('Terminal'); // Terminal, ECD
            $table->enum('road_side', ['row_start', 'row_end', 'both'])->default('both');
            $table->text('excluded_rows')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('yard_blocks');
    }
};
