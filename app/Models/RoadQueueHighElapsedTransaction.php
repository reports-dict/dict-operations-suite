<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RoadQueueHighElapsedTransaction extends Model
{
    protected $fillable = [
        'container',
        'category',
        'precheck_time',
        'elapsed_time',
        'assigned_che',
        'type_iso',
        'ob_carrier',
        'freight_kind',
        'line_op',
        'pos_slot_from',
        'pos_slot',
        'bat_nbr',
        'first_captured_at',
        'last_seen_at',
    ];

    protected $casts = [
        'precheck_time' => 'datetime',
        'first_captured_at' => 'datetime',
        'last_seen_at' => 'datetime',
    ];
}
