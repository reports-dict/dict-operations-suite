<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Models\YardAllocation;
use App\Models\YardBlock;
use App\Models\YardContainer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Public JSON endpoints (see routes/kiosk.php) polled by the kiosk board.
 * Ported from local-simplified-xps-v2's Api\ContainerController
 * (index/show/liveSearch) and Api\BlockController (index/show). Never
 * surface a raw exception to the unattended board - degrade to an empty
 * result and log instead (same pattern as VesselDashboardDataController).
 */
class ContainerYardDataController extends Controller
{
    /**
     * GET /operations/container-yard/data/blocks
     */
    public function blocks(Request $request): JsonResponse
    {
        try {
            $query = YardBlock::query();

            if ($request->has('facility')) {
                $query->byFacility($request->input('facility'));
            }

            if ($request->boolean('active_only', false)) {
                $query->active();
            }

            if ($request->has('search')) {
                $query->search($request->input('search'));
            }

            $sortBy = $request->input('sort_by', 'name');
            $sortOrder = $request->input('sort_order', 'asc');
            $query->orderBy($sortBy, $sortOrder);

            $perPage = (int) $request->input('per_page', 100);
            $blocks = $query->paginate($perPage);

            $blocks->getCollection()->transform(function (YardBlock $block) {
                return $block->append(['total_bays', 'total_rows', 'total_capacity']);
            });

            return response()->json([
                'success' => true,
                'data' => $blocks->items(),
                'pagination' => [
                    'current_page' => $blocks->currentPage(),
                    'total' => $blocks->total(),
                    'per_page' => $blocks->perPage(),
                    'last_page' => $blocks->lastPage(),
                ],
            ]);
        } catch (Throwable $e) {
            Log::error('Container Yard: failed to fetch blocks', ['error' => $e->getMessage()]);

            return response()->json(['success' => false, 'data' => [], 'pagination' => null]);
        }
    }

    /**
     * GET /operations/container-yard/data/containers
     */
    public function containers(Request $request): JsonResponse
    {
        try {
            $query = YardContainer::query();

            if ($request->has('search')) {
                $query->search($request->input('search'));
            }

            if ($request->has('block')) {
                $query->byBlock($request->input('block'));
            }

            if ($request->has('category')) {
                $query->byCategory($request->input('category'));
            }

            if ($request->has('line_op')) {
                $query->byLineOp($request->input('line_op'));
            }

            if ($request->has('dwell_days_min')) {
                $minDays = (int) $request->input('dwell_days_min');
                $maxDays = $request->has('dwell_days_max') ? (int) $request->input('dwell_days_max') : null;
                $query->byDwellDays($minDays, $maxDays);
            }

            $sortBy = $request->input('sort_by', 'created_at');
            $sortOrder = $request->input('sort_order', 'desc');
            $query->orderBy($sortBy, $sortOrder);

            $perPage = (int) $request->input('per_page', 50);
            $containers = $query->paginate($perPage);

            return response()->json([
                'success' => true,
                'data' => $containers->items(),
                'pagination' => [
                    'current_page' => $containers->currentPage(),
                    'total' => $containers->total(),
                    'per_page' => $containers->perPage(),
                    'last_page' => $containers->lastPage(),
                ],
            ]);
        } catch (Throwable $e) {
            Log::error('Container Yard: failed to fetch containers', ['error' => $e->getMessage()]);

            return response()->json(['success' => false, 'data' => [], 'pagination' => null]);
        }
    }

    /**
     * GET /operations/container-yard/data/search?q=CONTAINER_NUMBER
     *
     * Live placement-recommendation lookup, distinct from containers()
     * above - runs directly against sparcsn4 (not the synced yard_containers
     * mirror) keyed on container number, then cross-references
     * yard_allocations to recommend a yard location. Ported verbatim from
     * local-simplified-xps-v2's Api\ContainerController::liveSearch(), just
     * swapping DB::connection('sqlsrv') -> DB::connection('sparcsn4').
     */
    public function liveSearch(Request $request): JsonResponse
    {
        $containerNumber = trim($request->input('q', ''));

        if (empty($containerNumber)) {
            return response()->json([
                'success' => false,
                'error' => 'Missing query parameter: q',
            ], 422);
        }

        if (strlen($containerNumber) < 5) {
            return response()->json([
                'success' => false,
                'error' => 'Please enter at least 5 characters.',
            ], 422);
        }

        try {
            // If input is 5 or fewer chars, treat as suffix search; otherwise exact match
            $searchParam = strlen($containerNumber) <= 5
                ? '%'.$containerNumber
                : $containerNumber;

            $sql = "
                SELECT
                TOP 1
                    unit.id as container,
                    unit.category as category,
                    unit.goods_and_ctr_wt_kg as weight,

                    CASE
                        WHEN argo_ib.carrier_mode <> 'VESSEL' THEN 'TRUCK'
                        ELSE argo_ib.id
                    END AS ib_vessel,

                    CASE
                        WHEN argo_ob.carrier_mode <> 'VESSEL' THEN 'TRUCK'
                        ELSE argo_ob.id
                    END AS ob_vessel,

                    fcy_visit.last_pos_slot,
                    fcy_visit.arrive_pos_name,
                    wi.mvhs_carry_che_name,
                    wi.move_kind,
                    unit.freight_kind,
                    wi.move_kind as kind,
                    bizunit.id AS line_op,
                    routing_point.id as discharge_port,
                    routing_point_pol.id as loading_port,
                    CASE
                        WHEN eq_type.basic_length = 'BASIC20' THEN '20ft'
                        WHEN eq_type.basic_length = 'BASIC40' THEN '40ft'
                        ELSE ''
                    END as iso_basic_length,

                    CASE
                        WHEN wi.pos_slot LIKE '%TIP%' THEN tk_transactions.ctr_pos_slot
                        ELSE 'TIP'
                    END AS pos_slot_from,

                    wi.pos_slot,

                    COALESCE(carrier_service.id, carrier_service_ib.id) AS vessel_service,

                    COALESCE(
                        rtvd.bat_nbr,
                        TRY_CAST(tk_transactions.nbr AS VARCHAR(50))
                    ) AS bat_nbr,

                    eq_type.id as type_iso,
                    ref_eq.rfr_type as rfr_type,

                    CASE
                        WHEN ref_eq.rfr_type <> 'NON_RFR' THEN 'RFR'
                        ELSE 'DRY'
                    END AS reefer_type,

                    CASE
                        WHEN unit.category = 'IMPRT' THEN
                            CONCAT(
                                COALESCE(carrier_service.id, carrier_service_ib.id, ''),
                                ' ',
                                COALESCE(routing_point_pol.id, ''),
                                ' ',
                                CASE
                                    WHEN ref_eq.rfr_type <> 'NON_RFR' THEN 'RFR'
                                    ELSE 'DRY'
                                END
                            )
                        WHEN unit.category = 'EXPRT' THEN
                            CONCAT(
                                COALESCE(carrier_service.id, carrier_service_ib.id, ''),
                                ' ',
                                COALESCE(routing_point.id, ''),
                                ' ',
                                CASE
                                    WHEN ref_eq.rfr_type <> 'NON_RFR' THEN 'RFR'
                                    ELSE 'DRY'
                                END
                            )
                        ELSE NULL
                    END AS yard_slot,

                    CASE
                        WHEN wi.move_kind = 'DSCH' THEN
                            CONCAT(wi.mvhs_carry_che_name, ' >> ', wi.pos_slot)
                        WHEN wi.move_kind = 'YARD' THEN
                            CONCAT(fcy_visit.last_pos_slot, ' >> ', wi.pos_slot)
                        WHEN wi.move_kind = 'RECV' THEN
                            CONCAT(
                                COALESCE(rtvd.bat_nbr, TRY_CAST(tk_transactions.nbr AS VARCHAR(50))),
                                ' >> ',
                                wi.pos_slot
                            )
                        WHEN wi.move_kind = 'DLVR' THEN
                            CONCAT(
                                fcy_visit.last_pos_slot,
                                ' >> ',
                                COALESCE(rtvd.bat_nbr, TRY_CAST(tk_transactions.nbr AS VARCHAR(50)))
                            )
                        WHEN wi.move_kind = 'LOAD' THEN
                            CONCAT(fcy_visit.last_pos_slot, ' >> ', wi.pos_name)
                        ELSE NULL
                    END AS pos,
                    CASE
                        WHEN unit.category = 'EXPRT' THEN routing_point.id
                        WHEN unit.category = 'IMPRT' THEN routing_point_pol.id
                        ELSE NULL
                    END AS container_port

                FROM [sparcsn4].[dbo].[inv_wi] AS wi

                LEFT JOIN [sparcsn4].[dbo].[inv_unit_yrd_visit] AS yrd_visit
                    ON wi.uyv_gkey = yrd_visit.gkey

                LEFT JOIN [sparcsn4].[dbo].[inv_unit_fcy_visit] AS fcy_visit
                    ON yrd_visit.ufv_gkey = fcy_visit.gkey

                LEFT JOIN [sparcsn4].[dbo].[inv_unit] AS unit
                    ON fcy_visit.unit_gkey = unit.gkey

                LEFT JOIN [sparcsn4].[dbo].argo_carrier_visit as argo_cv
                    ON unit.cv_gkey = argo_cv.gkey

                INNER JOIN [sparcsn4].[dbo].[ref_bizunit_scoped] as bizunit
                    ON unit.line_op = bizunit.gkey

                INNER JOIN [sparcsn4].[dbo].[ref_routing_point] as routing_point
                    ON unit.pod1_gkey = routing_point.gkey

                INNER JOIN [sparcsn4].[dbo].[ref_routing_point] as routing_point_pol
                    ON unit.pol_gkey = routing_point_pol.gkey

                LEFT JOIN [sparcsn4].[dbo].[ref_carrier_service] as carrier_service
                    ON unit.service_gkey = carrier_service.gkey

                LEFT JOIN [sparcsn4].[dbo].[argo_carrier_visit] as carrier_visit
                    ON fcy_visit.actual_ib_cv = carrier_visit.gkey

                LEFT JOIN [sparcsn4].[dbo].[argo_visit_details] as visit_details
                    ON carrier_visit.cvcvd_gkey = visit_details.gkey

                LEFT JOIN [sparcsn4].[dbo].[ref_carrier_service] as carrier_service_ib
                    ON visit_details.service = carrier_service_ib.gkey

                OUTER APPLY (
                    SELECT TOP 1 *
                    FROM [sparcsn4].[dbo].[road_truck_transactions] t
                    WHERE t.unit_gkey = unit.gkey
                    ORDER BY t.created DESC
                ) tk_transactions

                LEFT JOIN [sparcsn4].[dbo].[road_truck_visit_details] as rtvd
                    ON tk_transactions.truck_visit_gkey = rtvd.tvdtls_gkey

                INNER JOIN [sparcsn4].[dbo].[ref_equipment] as ref_eq
                    ON unit.eq_gkey = ref_eq.gkey

                INNER JOIN [sparcsn4].[dbo].[ref_equip_type] as eq_type
                    ON ref_eq.eqtyp_gkey = eq_type.gkey

                LEFT JOIN [sparcsn4].[dbo].[argo_carrier_visit] as argo_ib
                    ON fcy_visit.actual_ib_cv = argo_ib.gkey

                LEFT JOIN [sparcsn4].[dbo].[argo_carrier_visit] as argo_ob
                    ON fcy_visit.actual_ob_cv = argo_ob.gkey

                WHERE
                    argo_cv.id != 'BBK_PLUGIN'
                    AND wi.move_kind IN ('DSCH','YARD','RECV','DLVR','LOAD')
                    AND unit.id LIKE ?

                ORDER BY wi.t_create DESC
            ";

            $results = DB::connection('sparcsn4')->select($sql, [$searchParam]);

            // Fallback: if first query returns nothing, use the simpler unit-based query
            if (empty($results)) {
                $sqlFallback = "
                    SELECT TOP 1
                        unit.id as container,
                        unit.category,
                        fcy_visit.last_pos_slot as pos,
                        eq_type.id as type_iso,
                        unit.goods_and_ctr_wt_kg as weight,
                        bizunit.id AS line_op,

                        CASE
                        WHEN argo_ib.carrier_mode <> 'VESSEL' THEN 'TRUCK'
                        ELSE argo_ib.id
                        END AS ib_vessel,

                        CASE
                        WHEN argo_ob.carrier_mode <> 'VESSEL' THEN 'TRUCK'
                        ELSE argo_ob.id
                        END AS ob_vessel,

                        COALESCE(carrier_service.id, carrier_service_ib.id) AS vessel_service,
                        routing_point.id as discharge_port,
                        routing_point_pol.id as loading_port,
                        CASE
                            WHEN eq_type.basic_length = 'BASIC20' THEN '20ft'
                            WHEN eq_type.basic_length = 'BASIC40' THEN '40ft'
                            ELSE ''
                        END as iso_basic_length,

                        CASE
                        WHEN ref_eq.rfr_type <> 'NON_RFR' THEN 'RFR'
                        ELSE 'DRY'
                        END AS reefer_type,

                        CASE
                        WHEN unit.category = 'IMPRT' THEN
                        CONCAT(
                            COALESCE(carrier_service.id, carrier_service_ib.id, ''),
                            ' ',
                            COALESCE(routing_point_pol.id, ''),
                            ' ',
                            CASE
                            WHEN ref_eq.rfr_type <> 'NON_RFR' THEN 'RFR'
                            ELSE 'DRY'
                        END
                        )
                        WHEN unit.category = 'EXPRT' THEN
                        CONCAT(
                            COALESCE(carrier_service.id, carrier_service_ib.id, ''),
                            ' ',
                            COALESCE(routing_point.id, ''),
                            ' ',
                            CASE
                            WHEN ref_eq.rfr_type <> 'NON_RFR' THEN 'RFR'
                            ELSE 'DRY'
                        END
                        )
                        ELSE NULL
                        END AS yard_slot,
                        CASE
                        WHEN unit.category = 'IMPRT' THEN
                        CONCAT(
                            COALESCE(carrier_service.id, carrier_service_ib.id, ''),
                            ' ',
                            COALESCE(routing_point_pol.id, ''),
                            ' ',
                            CASE
                            WHEN ref_eq.rfr_type <> 'NON_RFR' THEN 'RFR'
                            ELSE 'DRY'
                        END,
                        ' ',
                        CASE
                        WHEN eq_type.basic_length = 'BASIC20' THEN '20ft'
                        WHEN eq_type.basic_length = 'BASIC40' THEN '40ft'
                        ELSE ''
                        END
                        )

                        WHEN unit.category = 'EXPRT' THEN
                        CONCAT(
                            COALESCE(carrier_service.id, carrier_service_ib.id, ''),
                            ' ',
                            COALESCE(routing_point.id, ''),
                            ' ',
                            CASE
                            WHEN ref_eq.rfr_type <> 'NON_RFR' THEN 'RFR'
                            ELSE 'DRY'
                        END,
                        ' ',
                        CASE
                        WHEN eq_type.basic_length = 'BASIC20' THEN '20ft'
                        WHEN eq_type.basic_length = 'BASIC40' THEN '40ft'
                        ELSE ''
                        END
                        )

                        ELSE NULL
                        END AS yard_slot_v2,
                        CASE
                            WHEN unit.category = 'EXPRT' THEN routing_point.id
                            WHEN unit.category = 'IMPRT' THEN routing_point_pol.id
                            ELSE NULL
                        END AS container_port

                        FROM [sparcsn4].[dbo].[inv_unit] AS unit

                        INNER JOIN [sparcsn4].[dbo].[inv_unit_fcy_visit] AS fcy_visit
                        ON unit.gkey = fcy_visit.unit_gkey

                        INNER JOIN [sparcsn4].[dbo].[ref_equipment] as ref_eq
                        ON unit.eq_gkey = ref_eq.gkey

                        INNER JOIN [sparcsn4].[dbo].[ref_equip_type] as eq_type
                        ON ref_eq.eqtyp_gkey = eq_type.gkey

                        INNER JOIN [sparcsn4].[dbo].[ref_bizunit_scoped] as bizunit
                        ON unit.line_op = bizunit.gkey

                        INNER JOIN [sparcsn4].[dbo].[ref_routing_point] as routing_point
                        ON unit.pod1_gkey = routing_point.gkey

                        INNER JOIN [sparcsn4].[dbo].[ref_routing_point] as routing_point_pol
                        ON unit.pol_gkey = routing_point_pol.gkey

                        LEFT JOIN [sparcsn4].[dbo].argo_carrier_visit as argo_cv
                        ON unit.cv_gkey = argo_cv.gkey

                        LEFT JOIN [sparcsn4].[dbo].[argo_carrier_visit] as argo_ib
                        ON fcy_visit.actual_ib_cv = argo_ib.gkey

                        LEFT JOIN [sparcsn4].[dbo].[argo_carrier_visit] as argo_ob
                        ON fcy_visit.actual_ob_cv = argo_ob.gkey

                        LEFT JOIN [sparcsn4].[dbo].[ref_carrier_service] as carrier_service
                        ON unit.service_gkey = carrier_service.gkey

                        LEFT JOIN [sparcsn4].[dbo].[argo_carrier_visit] as carrier_visit
                        ON fcy_visit.actual_ib_cv = carrier_visit.gkey

                        LEFT JOIN [sparcsn4].[dbo].[argo_visit_details] as visit_details
                        ON carrier_visit.cvcvd_gkey = visit_details.gkey

                        LEFT JOIN [sparcsn4].[dbo].[ref_carrier_service] as carrier_service_ib
                        ON visit_details.service = carrier_service_ib.gkey

                        WHERE unit.id LIKE ?

                        ORDER BY fcy_visit.gkey DESC
                ";

                $results = DB::connection('sparcsn4')->select($sqlFallback, [$searchParam]);
            }

            // Look up allowed locations from yard_allocations using
            // vessel_service, discharge_port, iso_basic_length, reefer_type
            // from the first result.
            $allowedLocations = [];
            $debugFilter = [];
            if (! empty($results)) {
                $first = (array) $results[0];

                $service = $first['vessel_service'] ?? null;
                $dischPort = $first['container_port'] ?? null;
                $isoLength = $first['iso_basic_length'] ?? null;
                $reeferType = $first['reefer_type'] ?? null;

                $debugFilter = [
                    'service' => $service,
                    'discharge_port' => $dischPort,
                    'iso_basic_length' => $isoLength,
                    'reefer_type' => $reeferType,
                ];

                $allocationQuery = YardAllocation::query();

                if (! empty($service)) {
                    $allocationQuery->where('service', $service);
                }
                if (! empty($dischPort)) {
                    $allocationQuery->where('discharge_port', $dischPort);
                }
                if (! empty($isoLength)) {
                    $allocationQuery->where('iso_basic_length', $isoLength);
                }
                if (! empty($reeferType)) {
                    $allocationQuery->where('reefer_type', $reeferType);
                }

                $allowedLocations = $allocationQuery->pluck('location')->toArray();
            }

            return response()->json([
                'success' => true,
                'data' => $results,
                'count' => count($results),
                'allowed_locations' => $allowedLocations,
                'debug_filter' => $debugFilter,
            ]);
        } catch (Throwable $e) {
            Log::error('Container Yard: live search failed', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'error' => 'Query failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
