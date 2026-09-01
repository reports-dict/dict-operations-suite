<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Manually data-entered upcoming vessels, shown on the board in place of the
 * live sparcsn4 slideshow whenever there are no active vessel visits. Unlike
 * VesselVisit/VesselSyncLog/VesselPlanOverride this table has no
 * pre-existing production schema to respect - it's created here and lives on
 * the vessel_dashboard connection by default, but see
 * config('operations.vessel_schedule_connection') for why the connection is
 * resolved dynamically rather than hardcoded.
 */
class VesselSchedule extends Model
{
    protected $guarded = [];

    protected $casts = [
        'etb' => 'datetime',
        'etd' => 'datetime',
        'loa_meters' => 'decimal:2',
        'on_dock_at' => 'datetime',
        'departed_at' => 'datetime',
    ];

    public function getConnectionName(): string
    {
        return config('operations.vessel_schedule_connection');
    }
}
