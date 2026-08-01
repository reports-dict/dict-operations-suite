<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Driver extends Model
{
    protected $fillable = [
        'employee_id',
        'full_name',
        'designation',
        'is_active',
        'on_duty',
        'on_duty_since',
        'last_masterlist_synced_at',
        'last_attendance_synced_at',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'on_duty' => 'boolean',
        'on_duty_since' => 'datetime',
        'last_masterlist_synced_at' => 'datetime',
        'last_attendance_synced_at' => 'datetime',
    ];

    public function activeAssignment(): HasOne
    {
        return $this->hasOne(TruckAssignment::class)->whereNull('ended_at');
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(TruckAssignment::class);
    }
}
