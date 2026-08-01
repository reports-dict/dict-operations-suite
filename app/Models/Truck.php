<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Truck extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'truck_number',
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
