<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VesselVisit extends Model
{
    // Live database shared with vessel-dashboard-app - see
    // config/database.php's vessel_dashboard connection. Never run
    // migrations against it.
    protected $connection = 'vessel_dashboard';

    protected $fillable = [
        'ob_ib_id',
        'vessel_name',
        'service',
        'vessel_id',
        'phase',
        'line_op',
        'total_planned_loading_wi',
        'load_plan_fcl_20ft',
        'load_plan_fcl_40ft',
        'load_plan_empty_20ft',
        'load_plan_empty_40ft',
        'total_loaded_count',
        'loaded_fcl_20ft',
        'loaded_fcl_40ft',
        'loaded_empty_20ft',
        'loaded_empty_40ft',
        'total_planned_discharge',
        'discharge_plan_fcl_20ft',
        'discharge_plan_fcl_40ft',
        'discharge_plan_mty_20ft',
        'discharge_plan_mty_40ft',
        'total_discharged_count',
        'discharged_fcl_20ft',
        'discharged_fcl_40ft',
        'discharged_empty_20ft',
        'discharged_empty_40ft',
        'synced_at',
    ];

    protected $casts = [
        'synced_at' => 'datetime',
    ];

    public function scopeActive($query)
    {
        return $query->whereIn('phase', ['40WORKING', '30ARRIVED']);
    }
}
