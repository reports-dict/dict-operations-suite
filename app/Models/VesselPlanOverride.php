<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VesselPlanOverride extends Model
{
    // Live database shared with vessel-dashboard-app - see
    // config/database.php's vessel_dashboard connection. Never run
    // migrations against it.
    protected $connection = 'vessel_dashboard';

    protected $primaryKey = 'ob_ib_id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];
}
