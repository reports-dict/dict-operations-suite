<?php

namespace App\Services\Operations\VesselDashboard;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Single source of the raw sparcsn4 vessel-visit query and the per-crane
 * hourly move-graph query, ported verbatim from vessel-dashboard-app's
 * Api\DashboardController - both the public data endpoint and the hourly
 * sync command call fetchActiveVessels() so the query only lives in one
 * place (the source app duplicated it byte-for-byte between the controller
 * and the queued sync job).
 */
class VesselDashboardBoardService
{
    public function fetchActiveVessels(): array
    {
        DB::reconnect('sparcsn4');

        return DB::connection('sparcsn4')->select($this->query());
    }

    /**
     * Batched, per-hour, per-crane move totals for all active vessels over
     * the trailing 24 hours.
     */
    public function fetchCraneGraph(array $obIbIds): Collection
    {
        if (empty($obIbIds)) {
            return collect();
        }

        $inPlaceholders = implode(',', array_fill(0, count($obIbIds), '?'));
        $valuesPlaceholders = implode(',', array_fill(0, count($obIbIds), '(?)'));
        $sql = $this->craneGraphQuery($valuesPlaceholders, $inPlaceholders);
        $bindings = array_merge($obIbIds, $obIbIds, $obIbIds);

        return collect(DB::connection('sparcsn4')->select($sql, $bindings))
            ->groupBy('ob_ib_id');
    }

    /**
     * Per-truck crane-move breakdown for a single vessel + hour window,
     * drilled into from a clicked bar-chart segment on the board.
     * $windowStart/$windowEnd are 'Y-m-d H:i:s' strings, half-open
     * [windowStart, windowEnd).
     */
    public function fetchHourDetail(string $obIbId, string $windowStart, string $windowEnd): array
    {
        return DB::connection('sparcsn4')->select($this->hourDetailQuery(), [$obIbId, $windowStart, $windowEnd]);
    }

    private function query(): string
    {
        return <<<'SQL'
SELECT TOP 10
    argo_cv.gkey as ob_ib_id,
    argo_cv.ata as actual_time_of_arrival,
    argo_cv.atd as actual_time_of_departure,
    vvsl.name AS vessel_name,
    ref_c_service.id as service,
    argo_cv.id as vessel_id,
    argo_cv.phase,
    ref_biz.id as line_op,
    (SELECT count(*)
    FROM [sparcsn4].[dbo].[inv_wi]
    WHERE pos_loctype = 'VESSEL'
    AND pos_loc_gkey = argo_cv.gkey
    AND move_kind = 'LOAD') as total_planned_loading_wi,
    (SELECT count(*)
    FROM [sparcsn4].[dbo].[inv_wi] as wi
    LEFT JOIN [sparcsn4].[dbo].[inv_unit_yrd_visit] AS yrd_visit ON wi.uyv_gkey=yrd_visit.gkey
    LEFT JOIN [sparcsn4].[dbo].[inv_unit_fcy_visit] AS fcy_visit ON yrd_visit.ufv_gkey=fcy_visit.gkey
    LEFT JOIN [sparcsn4].[dbo].[inv_unit] AS unit ON fcy_visit.unit_gkey=unit.gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equipment] as ref_eq ON unit.eq_gkey = ref_eq.gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equip_type] as eq_type ON ref_eq.eqtyp_gkey = eq_type.gkey
    WHERE wi.pos_loctype = 'VESSEL' AND wi.pos_loc_gkey = argo_cv.gkey
    AND wi.move_kind = 'LOAD' AND eq_type.basic_length = 'BASIC20' AND unit.freight_kind = 'FCL') as load_plan_fcl_20ft,
    (SELECT count(*)
    FROM [sparcsn4].[dbo].[inv_wi] as wi
    LEFT JOIN [sparcsn4].[dbo].[inv_unit_yrd_visit] AS yrd_visit ON wi.uyv_gkey=yrd_visit.gkey
    LEFT JOIN [sparcsn4].[dbo].[inv_unit_fcy_visit] AS fcy_visit ON yrd_visit.ufv_gkey=fcy_visit.gkey
    LEFT JOIN [sparcsn4].[dbo].[inv_unit] AS unit ON fcy_visit.unit_gkey=unit.gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equipment] as ref_eq ON unit.eq_gkey = ref_eq.gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equip_type] as eq_type ON ref_eq.eqtyp_gkey = eq_type.gkey
    WHERE wi.pos_loctype = 'VESSEL' AND wi.pos_loc_gkey = argo_cv.gkey
    AND wi.move_kind = 'LOAD' AND eq_type.basic_length = 'BASIC40' AND unit.freight_kind = 'FCL') as load_plan_fcl_40ft,
    (SELECT count(*)
    FROM [sparcsn4].[dbo].[inv_wi] as wi
    LEFT JOIN [sparcsn4].[dbo].[inv_unit_yrd_visit] AS yrd_visit ON wi.uyv_gkey=yrd_visit.gkey
    LEFT JOIN [sparcsn4].[dbo].[inv_unit_fcy_visit] AS fcy_visit ON yrd_visit.ufv_gkey=fcy_visit.gkey
    LEFT JOIN [sparcsn4].[dbo].[inv_unit] AS unit ON fcy_visit.unit_gkey=unit.gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equipment] as ref_eq ON unit.eq_gkey = ref_eq.gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equip_type] as eq_type ON ref_eq.eqtyp_gkey = eq_type.gkey
    WHERE wi.pos_loctype = 'VESSEL' AND wi.pos_loc_gkey = argo_cv.gkey
    AND wi.move_kind = 'LOAD' AND eq_type.basic_length = 'BASIC20' AND unit.freight_kind = 'MTY') as load_plan_empty_20ft,
    (SELECT count(*)
    FROM [sparcsn4].[dbo].[inv_wi] as wi
    LEFT JOIN [sparcsn4].[dbo].[inv_unit_yrd_visit] AS yrd_visit ON wi.uyv_gkey=yrd_visit.gkey
    LEFT JOIN [sparcsn4].[dbo].[inv_unit_fcy_visit] AS fcy_visit ON yrd_visit.ufv_gkey=fcy_visit.gkey
    LEFT JOIN [sparcsn4].[dbo].[inv_unit] AS unit ON fcy_visit.unit_gkey=unit.gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equipment] as ref_eq ON unit.eq_gkey = ref_eq.gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equip_type] as eq_type ON ref_eq.eqtyp_gkey = eq_type.gkey
    WHERE wi.pos_loctype = 'VESSEL' AND wi.pos_loc_gkey = argo_cv.gkey
    AND wi.move_kind = 'LOAD' AND eq_type.basic_length = 'BASIC40' AND unit.freight_kind = 'MTY') as load_plan_empty_40ft,
    (SELECT count(*)
    FROM [sparcsn4].[dbo].[inv_unit] as unit
    INNER JOIN [sparcsn4].[dbo].[inv_unit_fcy_visit] as fcy_visit ON unit.gkey=fcy_visit.unit_gkey
    WHERE fcy_visit.actual_ob_cv = argo_cv.gkey AND unit.id NOT LIKE '%DUMM%' AND unit.id NOT LIKE '%SAMM%'
    AND unit.category IN ('EXPRT','TRSHP','THRGH') AND fcy_visit.transit_state = 'S60_LOADED') as total_loaded_count,
    (SELECT count(*)
    FROM [sparcsn4].[dbo].[inv_unit] as unit
    INNER JOIN [sparcsn4].[dbo].[inv_unit_fcy_visit] as fcy_visit ON unit.gkey=fcy_visit.unit_gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equipment] as ref_eq ON unit.eq_gkey = ref_eq.gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equip_type] as eq_type ON ref_eq.eqtyp_gkey = eq_type.gkey
    WHERE fcy_visit.actual_ob_cv = argo_cv.gkey AND unit.id NOT LIKE '%DUMM%' AND unit.id NOT LIKE '%SAMM%'
    AND unit.category IN ('EXPRT','TRSHP','THRGH') AND unit.freight_kind = 'FCL'
    AND fcy_visit.transit_state = 'S60_LOADED' AND eq_type.basic_length = 'BASIC20') as loaded_fcl_20ft,
    (SELECT count(*)
    FROM [sparcsn4].[dbo].[inv_unit] as unit
    INNER JOIN [sparcsn4].[dbo].[inv_unit_fcy_visit] as fcy_visit ON unit.gkey=fcy_visit.unit_gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equipment] as ref_eq ON unit.eq_gkey = ref_eq.gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equip_type] as eq_type ON ref_eq.eqtyp_gkey = eq_type.gkey
    WHERE fcy_visit.actual_ob_cv = argo_cv.gkey AND unit.id NOT LIKE '%DUMM%' AND unit.id NOT LIKE '%SAMM%'
    AND unit.category IN ('EXPRT','TRSHP','THRGH') AND unit.freight_kind = 'FCL'
    AND fcy_visit.transit_state = 'S60_LOADED' AND eq_type.basic_length = 'BASIC40') as loaded_fcl_40ft,
    (SELECT count(*)
    FROM [sparcsn4].[dbo].[inv_unit] as unit
    INNER JOIN [sparcsn4].[dbo].[inv_unit_fcy_visit] as fcy_visit ON unit.gkey=fcy_visit.unit_gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equipment] as ref_eq ON unit.eq_gkey = ref_eq.gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equip_type] as eq_type ON ref_eq.eqtyp_gkey = eq_type.gkey
    WHERE fcy_visit.actual_ob_cv = argo_cv.gkey AND unit.id NOT LIKE '%DUMM%' AND unit.id NOT LIKE '%SAMM%'
    AND unit.category IN ('EXPRT','TRSHP','THRGH') AND unit.freight_kind = 'MTY'
    AND fcy_visit.transit_state = 'S60_LOADED' AND eq_type.basic_length = 'BASIC20') as loaded_empty_20ft,
    (SELECT count(*)
    FROM [sparcsn4].[dbo].[inv_unit] as unit
    INNER JOIN [sparcsn4].[dbo].[inv_unit_fcy_visit] as fcy_visit ON unit.gkey=fcy_visit.unit_gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equipment] as ref_eq ON unit.eq_gkey = ref_eq.gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equip_type] as eq_type ON ref_eq.eqtyp_gkey = eq_type.gkey
    WHERE fcy_visit.actual_ob_cv = argo_cv.gkey AND unit.id NOT LIKE '%DUMM%' AND unit.id NOT LIKE '%SAMM%'
    AND unit.category IN ('EXPRT','TRSHP','THRGH') AND unit.freight_kind = 'MTY'
    AND fcy_visit.transit_state = 'S60_LOADED' AND eq_type.basic_length = 'BASIC40') as loaded_empty_40ft,
    (SELECT count(*)
    FROM [sparcsn4].[dbo].[inv_unit] as unit
    INNER JOIN [sparcsn4].[dbo].[inv_unit_fcy_visit] as fcy_visit ON unit.gkey=fcy_visit.unit_gkey
    WHERE fcy_visit.actual_ib_cv = argo_cv.gkey AND unit.id NOT LIKE '%DUMM%' AND unit.id NOT LIKE '%SAMM%'
    AND (
	unit.category IN ('IMPRT','TRSHP')
	OR (
		unit.category = 'THRGH'
		AND fcy_visit.restow_typ = 'RESTOW'
	)
    )) as total_planned_discharge,
    (SELECT count(*)
    FROM [sparcsn4].[dbo].[inv_unit] as unit
    INNER JOIN [sparcsn4].[dbo].[inv_unit_fcy_visit] as fcy_visit ON unit.gkey=fcy_visit.unit_gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equipment] as ref_eq ON unit.eq_gkey = ref_eq.gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equip_type] as eq_type ON ref_eq.eqtyp_gkey = eq_type.gkey
    WHERE fcy_visit.actual_ib_cv = argo_cv.gkey AND unit.id NOT LIKE '%DUMM%' AND unit.id NOT LIKE '%SAMM%'
    AND unit.freight_kind = 'FCL' AND eq_type.basic_length = 'BASIC20'
    AND (
	unit.category IN ('IMPRT','TRSHP')
	OR (
		unit.category = 'THRGH'
		AND fcy_visit.restow_typ = 'RESTOW'
	)
    )) as discharge_plan_fcl_20ft,
    (SELECT count(*)
    FROM [sparcsn4].[dbo].[inv_unit] as unit
    INNER JOIN [sparcsn4].[dbo].[inv_unit_fcy_visit] as fcy_visit ON unit.gkey=fcy_visit.unit_gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equipment] as ref_eq ON unit.eq_gkey = ref_eq.gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equip_type] as eq_type ON ref_eq.eqtyp_gkey = eq_type.gkey
    WHERE fcy_visit.actual_ib_cv = argo_cv.gkey AND unit.id NOT LIKE '%DUMM%' AND unit.id NOT LIKE '%SAMM%'
    AND unit.freight_kind = 'FCL' AND eq_type.basic_length = 'BASIC40'
    AND (
	unit.category IN ('IMPRT','TRSHP')
	OR (
		unit.category = 'THRGH'
		AND fcy_visit.restow_typ = 'RESTOW'
	)
    )) as discharge_plan_fcl_40ft,
    (SELECT count(*)
    FROM [sparcsn4].[dbo].[inv_unit] as unit
    INNER JOIN [sparcsn4].[dbo].[inv_unit_fcy_visit] as fcy_visit ON unit.gkey=fcy_visit.unit_gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equipment] as ref_eq ON unit.eq_gkey = ref_eq.gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equip_type] as eq_type ON ref_eq.eqtyp_gkey = eq_type.gkey
    WHERE fcy_visit.actual_ib_cv = argo_cv.gkey AND unit.id NOT LIKE '%DUMM%' AND unit.id NOT LIKE '%SAMM%'
    AND unit.freight_kind = 'MTY' AND eq_type.basic_length = 'BASIC20'
    AND (
	unit.category IN ('IMPRT','TRSHP')
	OR (
		unit.category = 'THRGH'
		AND fcy_visit.restow_typ = 'RESTOW'
	)
    )) as discharge_plan_mty_20ft,
    (SELECT count(*)
    FROM [sparcsn4].[dbo].[inv_unit] as unit
    INNER JOIN [sparcsn4].[dbo].[inv_unit_fcy_visit] as fcy_visit ON unit.gkey=fcy_visit.unit_gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equipment] as ref_eq ON unit.eq_gkey = ref_eq.gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equip_type] as eq_type ON ref_eq.eqtyp_gkey = eq_type.gkey
    WHERE fcy_visit.actual_ib_cv = argo_cv.gkey AND unit.id NOT LIKE '%DUMM%' AND unit.id NOT LIKE '%SAMM%'
    AND unit.freight_kind = 'MTY' AND eq_type.basic_length = 'BASIC40'
    AND (
	unit.category IN ('IMPRT','TRSHP')
	OR (
		unit.category = 'THRGH'
		AND fcy_visit.restow_typ = 'RESTOW'
	)
    )) as discharge_plan_mty_40ft,
    (SELECT count(*)
    FROM [sparcsn4].[dbo].[inv_unit] as unit
    INNER JOIN [sparcsn4].[dbo].[inv_unit_fcy_visit] as fcy_visit ON unit.gkey=fcy_visit.unit_gkey
    WHERE fcy_visit.actual_ib_cv = argo_cv.gkey AND unit.id NOT LIKE '%DUMM%' AND unit.id NOT LIKE '%SAMM%'
    AND (
	unit.category IN ('IMPRT','TRSHP')
	OR (
		unit.category = 'THRGH'
		AND fcy_visit.restow_typ = 'RESTOW'
	)
    ) AND fcy_visit.transit_state NOT IN ('S10_ADVISED','S20_INBOUND','S99_RETIRED')) as total_discharged_count,
    (SELECT count(*)
    FROM [sparcsn4].[dbo].[inv_unit] as unit
    INNER JOIN [sparcsn4].[dbo].[inv_unit_fcy_visit] as fcy_visit ON unit.gkey=fcy_visit.unit_gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equipment] as ref_eq ON unit.eq_gkey = ref_eq.gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equip_type] as eq_type ON ref_eq.eqtyp_gkey = eq_type.gkey
    WHERE fcy_visit.actual_ib_cv = argo_cv.gkey AND unit.id NOT LIKE '%DUMM%' AND unit.id NOT LIKE '%SAMM%'
    AND (
	unit.category IN ('IMPRT','TRSHP')
	OR (
		unit.category = 'THRGH'
		AND fcy_visit.restow_typ = 'RESTOW'
	)
    ) AND unit.freight_kind = 'FCL'
    AND fcy_visit.transit_state NOT IN ('S10_ADVISED','S20_INBOUND','S99_RETIRED') AND eq_type.basic_length = 'BASIC20') as discharged_fcl_20ft,
    (SELECT count(*)
    FROM [sparcsn4].[dbo].[inv_unit] as unit
    INNER JOIN [sparcsn4].[dbo].[inv_unit_fcy_visit] as fcy_visit ON unit.gkey=fcy_visit.unit_gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equipment] as ref_eq ON unit.eq_gkey = ref_eq.gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equip_type] as eq_type ON ref_eq.eqtyp_gkey = eq_type.gkey
    WHERE fcy_visit.actual_ib_cv = argo_cv.gkey AND unit.id NOT LIKE '%DUMM%' AND unit.id NOT LIKE '%SAMM%'
    AND (
	unit.category IN ('IMPRT','TRSHP')
	OR (
		unit.category = 'THRGH'
		AND fcy_visit.restow_typ = 'RESTOW'
	)
    ) AND unit.freight_kind = 'FCL'
    AND fcy_visit.transit_state NOT IN ('S10_ADVISED','S20_INBOUND','S99_RETIRED') AND eq_type.basic_length = 'BASIC40') as discharged_fcl_40ft,
    (SELECT count(*)
    FROM [sparcsn4].[dbo].[inv_unit] as unit
    INNER JOIN [sparcsn4].[dbo].[inv_unit_fcy_visit] as fcy_visit ON unit.gkey=fcy_visit.unit_gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equipment] as ref_eq ON unit.eq_gkey = ref_eq.gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equip_type] as eq_type ON ref_eq.eqtyp_gkey = eq_type.gkey
    WHERE fcy_visit.actual_ib_cv = argo_cv.gkey AND unit.id NOT LIKE '%DUMM%' AND unit.id NOT LIKE '%SAMM%'
    AND (
	unit.category IN ('IMPRT','TRSHP')
	OR (
		unit.category = 'THRGH'
		AND fcy_visit.restow_typ = 'RESTOW'
	)
    ) AND unit.freight_kind = 'MTY'
    AND fcy_visit.transit_state NOT IN ('S10_ADVISED','S20_INBOUND','S99_RETIRED') AND eq_type.basic_length = 'BASIC20') as discharged_empty_20ft,
    (SELECT count(*)
    FROM [sparcsn4].[dbo].[inv_unit] as unit
    INNER JOIN [sparcsn4].[dbo].[inv_unit_fcy_visit] as fcy_visit ON unit.gkey=fcy_visit.unit_gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equipment] as ref_eq ON unit.eq_gkey = ref_eq.gkey
    INNER JOIN [sparcsn4].[dbo].[ref_equip_type] as eq_type ON ref_eq.eqtyp_gkey = eq_type.gkey
    WHERE fcy_visit.actual_ib_cv = argo_cv.gkey AND unit.id NOT LIKE '%DUMM%' AND unit.id NOT LIKE '%SAMM%'
    AND (
	unit.category IN ('IMPRT','TRSHP')
	OR (
		unit.category = 'THRGH'
		AND fcy_visit.restow_typ = 'RESTOW'
	)
    ) AND unit.freight_kind = 'MTY'
    AND fcy_visit.transit_state NOT IN ('S10_ADVISED','S20_INBOUND','S99_RETIRED') AND eq_type.basic_length = 'BASIC40') as discharged_empty_40ft
FROM [sparcsn4].[dbo].vsl_vessels as vvsl
INNER JOIN [sparcsn4].[dbo].vsl_vessel_visit_details as vvsl_vd ON vvsl.gkey=vvsl_vd.vessel_gkey
INNER JOIN [sparcsn4].[dbo].argo_carrier_visit as argo_cv ON vvsl_vd.vvd_gkey=argo_cv.cvcvd_gkey
INNER JOIN [sparcsn4].[dbo].argo_visit_details as argo_vd ON argo_vd.gkey=argo_cv.cvcvd_gkey
INNER JOIN [sparcsn4].[dbo].ref_carrier_service as ref_c_service ON argo_vd.service=ref_c_service.gkey
INNER JOIN [sparcsn4].[dbo].ref_bizunit_scoped as ref_biz ON ref_biz.gkey=vvsl_vd.bizu_gkey
WHERE argo_cv.phase IN ('40WORKING','30ARRIVED') AND argo_cv.carrier_mode='VESSEL'
ORDER BY argo_cv.gkey DESC
SQL;
    }

    /**
     * $valuesPlaceholders is a comma-separated "(?)" list (one row per
     * vessel id) for the VALUES clause; $inPlaceholders is a comma-separated
     * "?" list for the two IN (...) filters. Both are sized to the number of
     * bound ob_ib_id values, and the bindings array passed to DB::select()
     * must repeat the same ob_ib_id list three times, in order (VesselIds,
     * MoveData, ECINData).
     */
    private function craneGraphQuery(string $valuesPlaceholders, string $inPlaceholders): string
    {
        return <<<SQL
DECLARE @CurrentHour DATETIME = DATEADD(HOUR, DATEDIFF(HOUR, 0, GETDATE()), 0);
DECLARE @StartHour   DATETIME = DATEADD(HOUR, -23, @CurrentHour);

;WITH HourSpine AS (
    SELECT @StartHour AS hour_bucket
    UNION ALL
    SELECT DATEADD(HOUR, 1, hour_bucket) FROM HourSpine WHERE hour_bucket < @CurrentHour
),
Spine AS (
    SELECT hs.hour_bucket, v.ob_ib_id
    FROM HourSpine hs
    CROSS JOIN (VALUES {$valuesPlaceholders}) AS v(ob_ib_id)
),
MoveData AS (
    SELECT
        argo_cv.gkey AS ob_ib_id,
        DATEADD(HOUR, DATEDIFF(HOUR, 0,
            CASE mv_event.move_kind WHEN 'DSCH' THEN mv_event.t_discharge ELSE mv_event.t_put END), 0) AS hour_bucket,
        COALESCE(xps_che.full_name, 'UNKR') AS crane,
        COUNT(*) AS total
    FROM [sparcsn4].[dbo].argo_carrier_visit AS argo_cv
    INNER JOIN [sparcsn4].[dbo].inv_move_event AS mv_event ON argo_cv.gkey = mv_event.carrier_gkey
    LEFT  JOIN [sparcsn4].[dbo].xps_che ON mv_event.che_qc = xps_che.gkey
    WHERE argo_cv.gkey IN ({$inPlaceholders})
      AND mv_event.move_kind IN ('SHOB','LOAD','DSCH')
      AND (CASE mv_event.move_kind WHEN 'DSCH' THEN mv_event.t_discharge ELSE mv_event.t_put END) >= @StartHour
    GROUP BY argo_cv.gkey,
        DATEADD(HOUR, DATEDIFF(HOUR, 0,
            CASE mv_event.move_kind WHEN 'DSCH' THEN mv_event.t_discharge ELSE mv_event.t_put END), 0),
        COALESCE(xps_che.full_name, 'UNKR')
    --HAVING COALESCE(xps_che.full_name, 'UNKR') <> 'UNKR'
),
ECINData AS (
    SELECT
        unit.declrd_ib_cv AS ob_ib_id,
        DATEADD(HOUR, DATEDIFF(HOUR, 0, fcy_visit.time_rnd), 0) AS hour_bucket,
        'ECIN' AS crane,
        COUNT(*) AS total
    FROM [sparcsn4].[dbo].inv_unit AS unit
    INNER JOIN [sparcsn4].[dbo].inv_unit_fcy_visit AS fcy_visit ON unit.gkey = fcy_visit.unit_gkey
    WHERE unit.declrd_ib_cv IN ({$inPlaceholders})
      AND (unit.category = 'IMPRT' OR unit.category = 'TRSHP')
      AND fcy_visit.transit_state = 'S30_ECIN'
      AND fcy_visit.time_rnd >= @StartHour
    GROUP BY unit.declrd_ib_cv, DATEADD(HOUR, DATEDIFF(HOUR, 0, fcy_visit.time_rnd), 0)
),
CombinedData AS (SELECT * FROM MoveData UNION ALL SELECT * FROM ECINData),
FinalData AS (
    SELECT
        sp.ob_ib_id,
        DATEPART(HOUR, sp.hour_bucket) AS move_hour,
        sp.hour_bucket,
        cd.crane,
        ISNULL(cd.total, 0) AS total
    FROM Spine sp
    LEFT JOIN CombinedData cd
        ON sp.hour_bucket = cd.hour_bucket AND sp.ob_ib_id = cd.ob_ib_id
),
FirstActive AS (
    SELECT ob_ib_id, MIN(hour_bucket) AS first_hour
    FROM FinalData
    WHERE total > 0
    GROUP BY ob_ib_id
)
SELECT fd.ob_ib_id, fd.move_hour, fd.hour_bucket, fd.crane, fd.total
FROM FinalData fd
LEFT JOIN FirstActive fa ON fd.ob_ib_id = fa.ob_ib_id
WHERE fd.hour_bucket >= ISNULL(fa.first_hour, @StartHour)
ORDER BY fd.ob_ib_id, fd.hour_bucket
OPTION (MAXRECURSION 24)
SQL;
    }

    /**
     * Per-truck move count + aggregated driver/crane names for one vessel
     * within a single hour window. Same inv_move_event/xps_che tables as
     * craneGraphQuery() above, joined out to xps_ecuser for the driver name,
     * scoped to QC cranes and load/discharge moves only - ported from
     * dict-portal's DashboardController::hourDetailQuery().
     */
    private function hourDetailQuery(): string
    {
        return <<<'SQL'
WITH move_data AS (
    SELECT
        che.short_name,
        ec_user.name AS driver_name,
        mv_event.pow,
        CASE WHEN mv_event.move_kind = 'LOAD' THEN mv_event.t_put ELSE mv_event.t_discharge END AS move_time
    FROM [sparcsn4].[dbo].[inv_move_event] mv_event
    INNER JOIN [sparcsn4].[dbo].[xps_che] che ON mv_event.che_carry = che.gkey
    LEFT JOIN [sparcsn4].[dbo].[xps_ecuser] ec_user ON mv_event.che_carry_login_name = ec_user.user_id
    WHERE mv_event.pow LIKE 'QC%'
      AND che.short_name LIKE 'T%'
      AND mv_event.move_kind IN ('LOAD','DSCH')
      AND mv_event.carrier_gkey = ?
),
windowed AS (
    SELECT * FROM move_data
    WHERE move_time >= ? AND move_time < ?
),
counts AS (
    SELECT short_name, COUNT(*) AS move_count
    FROM windowed
    GROUP BY short_name
),
distinct_drivers AS (
    SELECT DISTINCT short_name, driver_name FROM windowed
),
agg_drivers AS (
    SELECT short_name, STRING_AGG(driver_name, ', ') AS drivers
    FROM distinct_drivers
    GROUP BY short_name
),
distinct_pow AS (
    SELECT DISTINCT short_name, pow FROM windowed
),
agg_pow AS (
    SELECT short_name, STRING_AGG(pow, ', ') AS pows
    FROM distinct_pow
    GROUP BY short_name
)
SELECT
    c.short_name AS truck,
    c.move_count,
    d.drivers,
    p.pows
FROM counts c
LEFT JOIN agg_drivers d ON c.short_name = d.short_name
LEFT JOIN agg_pow p ON c.short_name = p.short_name
ORDER BY c.move_count DESC
SQL;
    }
}
