<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RoadQueueEcdTatHistory extends Model
{
    protected $table = 'road_queue_ecd_tat_history';

    protected $fillable = [
        'shift_label',
        'shift_start',
        'shift_end',
        'avg_tat',
        'avg_tat_seconds',
        'container_count',
        'recorded_at',
    ];

    protected $casts = [
        'shift_start' => 'datetime',
        'shift_end' => 'datetime',
        'recorded_at' => 'datetime',
    ];
}
