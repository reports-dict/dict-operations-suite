<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RoadQueueTatHistory extends Model
{
    protected $table = 'road_queue_tat_history';

    protected $fillable = [
        'shift_label',
        'shift_start',
        'shift_end',
        'status',
        'avg_tat',
        'avg_tat_seconds',
        'recorded_at',
    ];

    protected $casts = [
        'shift_start' => 'datetime',
        'shift_end' => 'datetime',
        'recorded_at' => 'datetime',
    ];
}
