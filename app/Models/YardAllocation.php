<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Service/discharge-port/iso-length/reefer-type -> recommended yard
 * location lookup, admin-managed. Ported from local-simplified-xps-v2's
 * App\Models\Allocation.
 */
class YardAllocation extends Model
{
    protected $table = 'yard_allocations';

    protected $fillable = [
        'service',
        'discharge_port',
        'iso_basic_length',
        'reefer_type',
        'location',
    ];
}
