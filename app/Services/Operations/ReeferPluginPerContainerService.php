<?php

namespace App\Services\Operations;

use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ReeferPluginPerContainerService
{
    /**
     * Reefer plug-in hours per container against the read-only sparcsn4
     * (Navis N4) connection.
     *
     * Unlike Per Category, plug-in hours here are CLIPPED to the selected
     * date range (a connect/disconnect pair that only partially overlaps
     * date_from/date_to only contributes the overlapping minutes) - this
     * was an explicit stakeholder decision, resolving the open question
     * flagged in APP REQUIREMENT.md. TOTAL_CONNECT_DISCONNECT stays
     * unscoped (counts every connect/disconnect event ever recorded for
     * the unit's gkey), matching Per Category and the original query.
     *
     * $dateFrom is required (the caller must gate on this before calling -
     * an unbounded query both times out and can outright error, same as
     * discovered for Per Category). $dateTo defaults to the end of today
     * when omitted.
     *
     * Returns every matching row unpaginated - the caller sorts, paginates,
     * and computes visit_index/total_visits in PHP (same as the mock data
     * this replaces), so this can return a large collection for wide date
     * ranges by design.
     *
     * @return Collection<int, array{container: string, category: string, transit_state: string, total_plugin_hours: float, total_connect_disconnect: int, line_op: string, type_iso: string, time_in: string}>
     */
    public function fetch(string $dateFrom, ?string $dateTo, string $category = 'both'): Collection
    {
        $categories = match ($category) {
            'imprt' => ['IMPRT'],
            'exprt' => ['EXPRT'],
            default => ['EXPRT', 'IMPRT'],
        };

        $dateFromValue = Carbon::parse($dateFrom)->startOfDay()->format('Y-m-d H:i:s');
        $dateToValue = ($dateTo ? Carbon::parse($dateTo)->endOfDay() : Carbon::now()->endOfDay())
            ->format('Y-m-d H:i:s');

        // PDO's sqlsrv driver rejects reusing the same named parameter at
        // more than one placeholder in a query, so each occurrence of the
        // same value needs its own uniquely-named binding.
        $bindings = [
            'date_to_1' => $dateToValue,
            'date_to_2' => $dateToValue,
            'date_to_3' => $dateToValue,
            'date_to_4' => $dateToValue,
            'date_from_1' => $dateFromValue,
            'date_from_2' => $dateFromValue,
            'date_from_3' => $dateFromValue,
            'date_from_4' => $dateFromValue,
        ];

        $categoryPlaceholders = [];
        foreach ($categories as $index => $categoryValue) {
            $key = "category_{$index}";
            $categoryPlaceholders[] = ":{$key}";
            $bindings[$key] = $categoryValue;
        }
        $categoryClause = implode(', ', $categoryPlaceholders);

        $sql = <<<SQL
            WITH ConnectEvents AS (
                SELECT
                    connect_event.applied_to_gkey,
                    connect_event.placed_time AS connect_time,
                    ISNULL(
                        (
                            SELECT TOP 1 disconnect_event.placed_time
                            FROM [sparcsn4].[dbo].[srv_event] AS disconnect_event
                            WHERE disconnect_event.applied_to_gkey = connect_event.applied_to_gkey
                              AND disconnect_event.event_type_gkey = '33'
                              AND disconnect_event.placed_time > connect_event.placed_time
                            ORDER BY disconnect_event.placed_time ASC
                        ),
                        GETDATE()
                    ) AS disconnect_time
                FROM [sparcsn4].[dbo].[srv_event] AS connect_event
                WHERE connect_event.event_type_gkey = '32'
                  AND connect_event.placed_time <= :date_to_1
            ),
            PluginPairs AS (
                SELECT
                    applied_to_gkey,
                    CASE WHEN connect_time > :date_from_1 THEN connect_time ELSE :date_from_2 END AS clipped_start,
                    CASE WHEN disconnect_time < :date_to_2 THEN disconnect_time ELSE :date_to_3 END AS clipped_end
                FROM ConnectEvents
                WHERE disconnect_time >= :date_from_3
            ),
            PluginHours AS (
                SELECT
                    applied_to_gkey,
                    SUM(
                        CASE WHEN clipped_end > clipped_start
                             THEN DATEDIFF(MINUTE, clipped_start, clipped_end)
                             ELSE 0
                        END
                    ) AS TOTAL_PLUGIN_MINUTES
                FROM PluginPairs
                GROUP BY applied_to_gkey
            )
            SELECT
                (
                    SELECT COUNT(*)
                    FROM [sparcsn4].[dbo].[srv_event]
                    WHERE applied_to_gkey = unit.gkey
                      AND (event_type_gkey = '32' OR event_type_gkey = '33')
                ) AS TOTAL_CONNECT_DISCONNECT,
                ROUND(ISNULL(ph.TOTAL_PLUGIN_MINUTES, 0) / 60.0, 2) AS TOTAL_PLUGIN_HOURS,
                unit.id AS container,
                fcy_visit.transit_state AS transit_state,
                unit.category,
                bizunit.id AS line_op,
                eq_type.id AS type_iso,
                fcy_visit.time_in AS time_in
            FROM [sparcsn4].[dbo].[inv_unit] AS unit
            INNER JOIN [sparcsn4].[dbo].[inv_unit_fcy_visit] AS fcy_visit
                ON unit.gkey = fcy_visit.unit_gkey
            INNER JOIN [sparcsn4].[dbo].[ref_equipment] AS ref
                ON unit.eq_gkey = ref.gkey
            INNER JOIN [sparcsn4].[dbo].[ref_equip_type] AS eq_type
                ON ref.eqtyp_gkey = eq_type.gkey
            INNER JOIN [sparcsn4].[dbo].[ref_bizunit_scoped] AS bizunit
                ON unit.line_op = bizunit.gkey
            LEFT JOIN PluginHours AS ph
                ON ph.applied_to_gkey = unit.gkey
            WHERE
                fcy_visit.time_in >= :date_from_4
                AND fcy_visit.time_in <= :date_to_4
                AND unit.category IN ({$categoryClause})
                AND unit.freight_kind = 'FCL'
                AND ref.rfr_type = 'INTEG_AIR'
            SQL;

        $rows = DB::connection('sparcsn4')->select($sql, $bindings);

        return collect($rows)->map(fn ($row) => [
            'container' => $row->container,
            'category' => $row->category,
            'transit_state' => $row->transit_state,
            'total_plugin_hours' => (float) $row->TOTAL_PLUGIN_HOURS,
            'total_connect_disconnect' => (int) $row->TOTAL_CONNECT_DISCONNECT,
            'line_op' => $row->line_op,
            'type_iso' => $row->type_iso,
            'time_in' => $row->time_in,
        ]);
    }
}
