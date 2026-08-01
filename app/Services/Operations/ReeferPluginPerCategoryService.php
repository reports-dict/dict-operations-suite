<?php

namespace App\Services\Operations;

use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ReeferPluginPerCategoryService
{
    /**
     * Reefer plug-in hours aggregated per category (IMPRT/EXPRT) against the
     * read-only sparcsn4 (Navis N4) connection.
     *
     * $dateFrom is optional (open lower bound when omitted). $dateTo defaults
     * to the end of today when omitted, per the stakeholder's "match the
     * date to the current date" instruction - not left NULL/open-ended.
     *
     * @return Collection<int, array{category: string, total_containers: int, total_connect_disconnect: int, total_plugin_hours: float}>
     */
    public function summarize(?string $dateFrom, ?string $dateTo, string $category = 'both'): Collection
    {
        $categories = match ($category) {
            'imprt' => ['IMPRT'],
            'exprt' => ['EXPRT'],
            default => ['EXPRT', 'IMPRT'],
        };

        $resolvedDateTo = $dateTo
            ? Carbon::parse($dateTo)->endOfDay()
            : Carbon::now()->endOfDay();

        $bindings = [
            'date_to' => $resolvedDateTo->format('Y-m-d H:i:s'),
        ];

        $dateFromClause = '';
        if ($dateFrom) {
            $dateFromClause = 'AND fcy_visit.time_in >= :date_from';
            $bindings['date_from'] = Carbon::parse($dateFrom)->startOfDay()->format('Y-m-d H:i:s');
        }

        $categoryPlaceholders = [];
        foreach ($categories as $index => $categoryValue) {
            $key = "category_{$index}";
            $categoryPlaceholders[] = ":{$key}";
            $bindings[$key] = $categoryValue;
        }
        $categoryClause = implode(', ', $categoryPlaceholders);

        $sql = <<<SQL
            WITH PluginPairs AS (
                SELECT
                    connect_event.applied_to_gkey,
                    DATEDIFF(MINUTE,
                        connect_event.placed_time,
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
                        )
                    ) AS plugin_minutes
                FROM [sparcsn4].[dbo].[srv_event] AS connect_event
                WHERE connect_event.event_type_gkey = '32'
            ),
            PluginHours AS (
                SELECT
                    applied_to_gkey,
                    SUM(plugin_minutes) AS TOTAL_PLUGIN_MINUTES
                FROM PluginPairs
                GROUP BY applied_to_gkey
            ),
            ConnectDisconnectCounts AS (
                SELECT
                    applied_to_gkey,
                    COUNT(*) AS CONNECT_DISCONNECT_COUNT
                FROM [sparcsn4].[dbo].[srv_event]
                WHERE event_type_gkey IN ('32','33')
                GROUP BY applied_to_gkey
            )
            SELECT
                unit.category,
                COUNT(DISTINCT unit.gkey) AS TOTAL_CONTAINERS,
                SUM(ISNULL(cdc.CONNECT_DISCONNECT_COUNT, 0)) AS TOTAL_CONNECT_DISCONNECT,
                SUM(ISNULL(ph.TOTAL_PLUGIN_MINUTES, 0)) AS TOTAL_PLUGIN_MINUTES,
                ROUND(SUM(ISNULL(ph.TOTAL_PLUGIN_MINUTES, 0)) / 60.0, 2) AS TOTAL_PLUGIN_HOURS
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
            LEFT JOIN ConnectDisconnectCounts AS cdc
                ON cdc.applied_to_gkey = unit.gkey
            WHERE
                fcy_visit.time_in <= :date_to
                {$dateFromClause}
                AND unit.category IN ({$categoryClause})
                AND unit.freight_kind = 'FCL'
                AND ref.rfr_type = 'INTEG_AIR'
            GROUP BY
                unit.category
            ORDER BY
                unit.category
            SQL;

        $rows = DB::connection('sparcsn4')->select($sql, $bindings);

        return collect($rows)->map(fn ($row) => [
            'category' => $row->category,
            'total_containers' => (int) $row->TOTAL_CONTAINERS,
            'total_connect_disconnect' => (int) $row->TOTAL_CONNECT_DISCONNECT,
            'total_plugin_hours' => (float) $row->TOTAL_PLUGIN_HOURS,
        ]);
    }
}
