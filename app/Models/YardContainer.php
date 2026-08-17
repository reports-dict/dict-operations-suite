<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Local mirror of yard container positions, refreshed by
 * ContainerYardSyncService. Ported verbatim (fillable/casts/consts/scopes)
 * from local-simplified-xps-v2's App\Models\Container.
 */
class YardContainer extends Model
{
    protected $table = 'yard_containers';

    protected $fillable = [
        'container',
        'category',
        'iso_type',
        'position',
        'time_in',
        'notes',
        'dwell_days',
        'line_op',
        'transit_state',
        'condition',
        'pod',
        'pod_place_name',
        'pol',
        'pol_place_name',
        'outbound_carrier_id',
        'outbound_carrier_name',
        'inbound_carrier_id',
        'inbound_carrier_name',
        'shipper',
        'consignee',
        'requires_power',
        'is_powered',
    ];

    protected $appends = [
        'requires_power',
        'is_powered',
    ];

    protected $casts = [
        'time_in' => 'datetime',
    ];

    const CATEGORIES = [
        'Import',
        'Export',
        'Storage',
        'Transship',
    ];

    const ISO_TYPES = [
        '20ft',
        '40ft',
    ];

    const CONDITIONS = [
        'Good',
        'Fair',
        'Poor',
        'Unknown',
    ];

    const TRANSIT_STATES = [
        'Loaded',
        'Empty',
        'Damaged',
    ];

    /**
     * Get the position components (block, bay, row, tier).
     * Expected format: "BLOCK-BAY-ROW-TIER".
     */
    public function getPositionComponents(): array
    {
        $parts = explode('-', $this->position);

        return [
            'block' => $parts[0] ?? null,
            'bay' => $parts[1] ?? null,
            'row' => $parts[2] ?? null,
            'tier' => $parts[3] ?? null,
        ];
    }

    public function scopeByCategory($query, $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Position format: B{block_number}{bay}{row}{tier}, e.g. B0707F1 =
     * Block 07, Bay 07, Row F, Tier 1.
     */
    public function scopeByBlock($query, $block)
    {
        return $query->where('position', 'like', "$block%");
    }

    public function scopeByLineOp($query, $lineOp)
    {
        return $query->where('line_op', $lineOp);
    }

    public function scopeByDwellDays($query, $minDays, $maxDays = null)
    {
        if ($maxDays !== null) {
            return $query->whereBetween('dwell_days', [$minDays, $maxDays]);
        }

        return $query->where('dwell_days', '>=', $minDays);
    }

    public function scopeSearch($query, $term)
    {
        return $query->where('container', 'like', "%$term%")
            ->orWhere('shipper', 'like', "%$term%");
    }

    public function getRequiresPowerAttribute($value)
    {
        if ($value === null) {
            return false;
        }

        return (bool) ((int) $value);
    }

    public function getIsPoweredAttribute($value)
    {
        if ($value === null) {
            return false;
        }

        return (bool) ((int) $value);
    }

    public function toArray()
    {
        $array = parent::toArray();
        $array['requires_power'] = $this->requires_power;
        $array['is_powered'] = $this->is_powered;

        return $array;
    }
}
