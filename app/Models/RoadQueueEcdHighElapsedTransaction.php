<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RoadQueueEcdHighElapsedTransaction extends Model
{
    protected $fillable = [
        'container',
        'category',
        'truck_visit_entered_yard',
        'elapsed_time',
        'assigned_che',
        'type_iso',
        'ob_carrier',
        'freight_kind',
        'line_op',
        'pos_slot_from',
        'pos_slot',
        'trucking_company',
        'bat_nbr',
        'first_captured_at',
        'last_seen_at',
    ];

    protected $casts = [
        'truck_visit_entered_yard' => 'datetime',
        'first_captured_at' => 'datetime',
        'last_seen_at' => 'datetime',
    ];
}
