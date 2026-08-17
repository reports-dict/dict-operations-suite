<?php

namespace App\Services\Operations\ContainerYard;

use App\Models\YardContainer;
use App\Models\YardSyncLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Sync of yard container positions from sparcsn4 into the local
 * yard_containers mirror. Ported from local-simplified-xps-v2's
 * App\Console\Commands\SyncContainersFromMssql::fetchFromMssql()/handle(),
 * with two changes: DB::connection('sqlsrv') -> DB::connection('sparcsn4'),
 * and the source's Redis Cache::put('sync:status', ...) replaced by a
 * YardSyncLog row (this suite runs CACHE_STORE=database, and the
 * established pattern for sync health here is a DB log table - see
 * App\Services\Operations\VesselDashboard\VesselVisitSyncService).
 */
class ContainerYardSyncService
{
    public function sync(string $trigger = 'scheduled'): YardSyncLog
    {
        try {
            $rawContainers = $this->fetchFromMssql();
            $mssqlContainers = collect($rawContainers);

            if ($mssqlContainers->isEmpty()) {
                return YardSyncLog::create([
                    'ran_at' => now(),
                    'status' => 'error',
                    'message' => 'No containers found in sparcsn4',
                    'count' => 0,
                    'trigger' => $trigger,
                ]);
            }

            // Clear existing containers and batch-insert the fresh set - same
            // truncate-then-reload approach as the source command, no diffing.
            YardContainer::truncate();

            $batchSize = 1000;
            $total = $mssqlContainers->count();
            $inserted = 0;

            foreach ($mssqlContainers->chunk($batchSize) as $batch) {
                $data = $batch->map(function ($item) {
                    return [
                        'container' => $item->container ?? null,
                        'category' => $item->category ?? null,
                        'iso_type' => $item->iso_type ?? null,
                        'time_in' => $item->time_in ?? null,
                        'position' => $this->cleanPosition($item->position ?? null),
                        'dwell_days' => $item->dwell_days ?? 0,
                        'line_op' => $item->line_op ?? null,
                        'transit_state' => $item->transit_state ?? null,
                        'condition' => $item->condition ?? null,
                        'pod' => $item->pod ?? null,
                        'pod_place_name' => $item->pod_place_name ?? null,
                        'pol' => $item->pol ?? null,
                        'pol_place_name' => $item->pol_place_name ?? null,
                        'outbound_carrier_id' => $item->outbound_carrier_id ?? null,
                        'outbound_carrier_name' => $item->outbound_carrier_name ?? null,
                        'inbound_carrier_id' => $item->inbound_carrier_id ?? null,
                        'inbound_carrier_name' => $item->inbound_carrier_name ?? null,
                        'shipper' => $item->shipper ?? null,
                        'consignee' => $item->consignee ?? null,
                        'requires_power' => $this->convertToBoolean($item->requires_power ?? null),
                        'is_powered' => $this->convertToBoolean($item->is_powered ?? null),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                })->toArray();

                YardContainer::insert($data);
                $inserted += count($data);
            }

            return YardSyncLog::create([
                'ran_at' => now(),
                'status' => 'success',
                'message' => 'Sync completed successfully',
                'count' => $inserted,
                'trigger' => $trigger,
            ]);
        } catch (Throwable $e) {
            Log::error('Container Yard: sync failed', ['trigger' => $trigger, 'error' => $e->getMessage()]);

            return YardSyncLog::create([
                'ran_at' => now(),
                'status' => 'error',
                'message' => $e->getMessage(),
                'count' => YardContainer::count(),
                'trigger' => $trigger,
            ]);
        }
    }

    /**
     * Fetch containers from sparcsn4 with all required fields. Query carried
     * over verbatim from the source app, just re-pointed at the 'sparcsn4'
     * connection instead of 'sqlsrv'.
     */
    private function fetchFromMssql()
    {
        return DB::connection('sparcsn4')->select("
            SELECT
    ref.id_full AS container,
    unit.category AS category,
    eq_type.id as iso_type,
    fcy_visit.time_in,
    --fcy_visit.last_pos_name as position,
    CASE
        WHEN LEFT(fcy_visit.last_pos_name, 8) = 'Y-DICT1-'
          OR LEFT(fcy_visit.last_pos_name, 8) = 'Y-DICT2-'
        THEN SUBSTRING(fcy_visit.last_pos_name, 9, LEN(fcy_visit.last_pos_name))
        ELSE fcy_visit.last_pos_name
    END AS position,
    DATEDIFF(day, fcy_visit.time_in, GETDATE()) AS dwell_days,
    bizunit.id AS line_op,
    SUBSTRING(fcy_visit.transit_state, 5, LEN(fcy_visit.transit_state)) AS transit_state,
    cond.description AS condition,
    pod_route.id as pod,
    pod_unloc.place_name as pod_place_name,
    pol_route.id as pol,
    pol_unloc.place_name as pol_place_name,
    ob_argo_cv.id as outbound_carrier_id,
    ob_vvsl.name as outbound_carrier_name,
    ib_argo_cv.id as inbound_carrier_id,
    ib_vvsl.name as inbound_carrier_name,
    ref_biz_shipper.name as shipper,
    ref_biz_consignee.name as consignee,
    unit.requires_power,
    unit.is_powered
FROM
    [sparcsn4].[dbo].[inv_unit_fcy_visit] AS fcy_visit
INNER JOIN [sparcsn4].[dbo].[inv_unit] AS unit
    ON fcy_visit.unit_gkey = unit.gkey
INNER JOIN [sparcsn4].[dbo].[ref_equipment] AS ref
    ON ref.gkey = unit.eq_gkey
INNER JOIN [sparcsn4].[dbo].[ref_equip_type] as eq_type
    ON ref.eqtyp_gkey = eq_type.gkey
INNER JOIN [sparcsn4].[dbo].[inv_goods] AS goods
    ON unit.goods = goods.gkey
LEFT JOIN [sparcsn4].[dbo].[ref_bizunit_scoped] as ref_biz_shipper
    ON goods.shipper_bzu=ref_biz_shipper.gkey
LEFT JOIN [sparcsn4].[dbo].[ref_bizunit_scoped] as ref_biz_consignee
    ON goods.consignee_bzu=ref_biz_consignee.gkey
INNER JOIN [sparcsn4].[dbo].[ref_bizunit_scoped] AS bizunit
    ON unit.line_op = bizunit.gkey
LEFT JOIN [sparcsn4].[dbo].[ref_equip_conditions] AS cond
    ON unit.condition_gkey = cond.gkey
LEFT JOIN [sparcsn4].[dbo].[ref_routing_point] AS pol_route
    ON unit.pol_gkey = pol_route.gkey
LEFT JOIN [sparcsn4].[dbo].[ref_routing_point] AS pod_route
    ON unit.pod1_gkey = pod_route.gkey
LEFT JOIN [sparcsn4].[dbo].[ref_unloc_code] AS pol_unloc
    ON pol_route.unloc_gkey = pol_unloc.gkey
LEFT JOIN [sparcsn4].[dbo].[ref_unloc_code] AS pod_unloc
    ON pod_route.unloc_gkey = pod_unloc.gkey
--vessel details

LEFT JOIN [sparcsn4].[dbo].[argo_carrier_visit] AS ob_argo_cv
    ON fcy_visit.actual_ob_cv = ob_argo_cv.gkey

LEFT JOIN [sparcsn4].[dbo].[argo_carrier_visit] AS ib_argo_cv
    ON fcy_visit.actual_ib_cv = ib_argo_cv.gkey

LEFT JOIN dbo.vsl_vessel_visit_details as ob_vvsl_vd
ON ob_argo_cv.cvcvd_gkey=ob_vvsl_vd.vvd_gkey

LEFT JOIN dbo.vsl_vessel_visit_details as ib_vvsl_vd
ON ib_argo_cv.cvcvd_gkey=ib_vvsl_vd.vvd_gkey

LEFT JOIN dbo.vsl_vessels as ob_vvsl
ON ob_vvsl_vd.vessel_gkey=ob_vvsl.gkey

LEFT JOIN dbo.vsl_vessels as ib_vvsl
ON ib_vvsl_vd.vessel_gkey=ib_vvsl.gkey

WHERE
    --unit.category IN ('EXPRT') AND
    fcy_visit.transit_state = 'S40_YARD'
    AND LEN(
        CASE
            WHEN LEFT(fcy_visit.last_pos_name, 8) IN ('Y-DICT1-', 'Y-DICT2-')
                THEN SUBSTRING(fcy_visit.last_pos_name, 9, LEN(fcy_visit.last_pos_name))
            ELSE fcy_visit.last_pos_name
        END
    ) >= 4
    AND
        CASE
            WHEN LEFT(fcy_visit.last_pos_name, 8) IN ('Y-DICT1-', 'Y-DICT2-')
                THEN SUBSTRING(fcy_visit.last_pos_name, 9, LEN(fcy_visit.last_pos_name))
            ELSE fcy_visit.last_pos_name
        END LIKE 'B%'
ORDER BY
    fcy_visit.time_move DESC;
        ");
    }

    /**
     * Position is already cleaned by SQL (SUBSTRING removes the Y-DICT1-/
     * Y-DICT2- prefix) - kept as a no-op pass-through for parity with the
     * source command.
     */
    private function cleanPosition($position)
    {
        return empty($position) ? null : $position;
    }

    /**
     * Convert various sparcsn4 bit-column representations (bool, int,
     * numeric string, 'true'/'yes'/'t'/'y'/'on') to a proper 0/1.
     */
    private function convertToBoolean($value): int
    {
        if ($value === null) {
            return 0;
        }

        if (is_bool($value)) {
            return $value ? 1 : 0;
        }

        if (is_numeric($value)) {
            return ((int) $value) > 0 ? 1 : 0;
        }

        if (is_string($value)) {
            $lower = strtolower(trim($value));

            return in_array($lower, ['1', 'true', 'yes', 't', 'y', 'on'], true) ? 1 : 0;
        }

        return 0;
    }
}
