<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VesselSyncLog extends Model
{
    // Live database shared with vessel-dashboard-app - see
    // config/database.php's vessel_dashboard connection. Never run
    // migrations against it. Table name matches vessel-dashboard-app's own
    // original schema exactly ("sync_logs", not "vessel_sync_logs") -
    // this connection points at that same live table, it can't be renamed.
    protected $connection = 'vessel_dashboard';

    protected $table = 'sync_logs';

    protected $fillable = [
        'ran_at',
        'rows_fetched',
        'rows_upserted',
        'status',
        'error_message',
        'duration_ms',
    ];

    protected $casts = [
        'ran_at' => 'datetime',
    ];
}
