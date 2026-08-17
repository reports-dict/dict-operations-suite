<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Yard block geometry (bay/row/tier extents), admin-managed. Ported from
 * local-simplified-xps-v2's App\Models\Block.
 */
class YardBlock extends Model
{
    protected $table = 'yard_blocks';

    protected $fillable = [
        'name',
        'bay_start',
        'bay_end',
        'row_start',
        'row_end',
        'max_tier',
        'facility',
        'road_side',
        'excluded_rows',
        'is_active',
    ];

    protected $casts = [
        'bay_start' => 'integer',
        'bay_end' => 'integer',
        'max_tier' => 'integer',
        'is_active' => 'boolean',
    ];

    const FACILITIES = [
        'Terminal',
        'ECD',
    ];

    public function getTotalBaysAttribute(): int
    {
        return $this->bay_end - $this->bay_start + 1;
    }

    public function getTotalRowsAttribute(): int
    {
        $rows = [];
        for ($char = ord($this->row_start); $char <= ord($this->row_end); $char++) {
            $rows[] = chr($char);
        }

        return count($rows);
    }

    public function getTotalCapacityAttribute(): int
    {
        return $this->total_bays * $this->total_rows * $this->max_tier;
    }

    public function scopeByFacility($query, $facility)
    {
        return $query->where('facility', $facility);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeSearch($query, $term)
    {
        return $query->where('name', 'like', "%$term%");
    }
}
