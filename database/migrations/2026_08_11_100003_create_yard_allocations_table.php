<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Service/discharge-port/iso-length/reefer-type -> recommended yard
     * location lookup, admin-managed. Ported from local-simplified-xps-v2's
     * `allocations` table (App\Models\Allocation) - used by
     * ContainerYardDataController@liveSearch to recommend placement.
     */
    public function up(): void
    {
        Schema::create('yard_allocations', function (Blueprint $table) {
            $table->id();
            $table->string('service')->nullable();
            $table->string('discharge_port')->nullable();
            $table->string('iso_basic_length')->nullable();
            $table->string('reefer_type')->nullable();
            $table->string('location');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('yard_allocations');
    }
};
