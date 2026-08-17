<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Sync health log for ContainerYardSyncService - queried directly by the
 * Container Yard Management page, replacing the source app's Redis
 * `Cache::put('sync:status', ...)` with a DB-backed log (see
 * App\Models\VesselSyncLog for the precedent this follows).
 */
class YardSyncLog extends Model
{
    protected $table = 'yard_sync_logs';

    protected $fillable = [
        'ran_at',
        'status',
        'message',
        'count',
        'trigger',
    ];

    protected $casts = [
        'ran_at' => 'datetime',
    ];
}
