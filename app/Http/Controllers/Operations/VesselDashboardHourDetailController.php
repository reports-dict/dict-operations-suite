<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Services\Operations\VesselDashboard\VesselDashboardBoardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

/**
 * Drill-down detail for a single vessel + hour window, clicked from the
 * per-hour bar chart on the public board (see routes/kiosk.php - this stays
 * public for the same reason the board and its data feed do). Merges two
 * independent sources - sqlsrv crane move events and Supabase driver-
 * accomplishment records - reported separately since they carry unrelated
 * dimensions (truck vs. truck model) rather than a shared key to join on.
 * Ported from dict-portal's DashboardController::hourDetail().
 */
class VesselDashboardHourDetailController extends Controller
{
    public function __invoke(Request $request, string $obIbId, VesselDashboardBoardService $boardService): JsonResponse
    {
        $hourBucket = $request->query('hour_bucket');

        if (! is_string($hourBucket) || $hourBucket === '') {
            abort(422, 'hour_bucket is required.');
        }

        // The hour bucket returned by the data endpoint is Manila-local (same
        // convention as craneGraphQuery()'s GETDATE()-based hours), spanning
        // to +1 hour.
        $windowStart = Carbon::parse($hourBucket, 'Asia/Manila');
        $windowEnd = $windowStart->copy()->addHour();

        // The cranes this bar actually shows nonzero moves for, sent by the
        // frontend from the same graph data the bar itself was drawn from.
        // Supabase has no vessel link, so this - not either query's own
        // result - is the only reliable way to scope it to this vessel.
        // Null (param missing entirely) means "unknown" and falls back to
        // every QC crane; an empty list means the bar genuinely has zero
        // QC-crane moves this hour.
        $cranesParam = $request->query('cranes');
        $cranes = $cranesParam === null
            ? null
            : array_values(array_filter(explode(',', (string) $cranesParam), fn (string $crane) => $crane !== ''));

        $sqlsrv = ['data' => [], 'error' => null];

        try {
            $rows = $boardService->fetchHourDetail(
                $obIbId,
                $windowStart->format('Y-m-d H:i:s'),
                $windowEnd->format('Y-m-d H:i:s'),
            );

            // The sqlsrv driver returns COUNT(*) as a numeric string, not an int.
            foreach ($rows as $row) {
                $row->move_count = (int) $row->move_count;
            }

            $sqlsrv['data'] = $rows;
        } catch (Throwable) {
            $sqlsrv['error'] = 'Failed to load SQL Server data.';
        }

        $supabase = ['data' => [], 'error' => null];

        try {
            $supabase['data'] = $this->fetchSupabaseTruckModelCounts($windowStart, $windowEnd, $cranes);
        } catch (Throwable) {
            $supabase['error'] = 'Failed to load Supabase data.';
        }

        return response()->json([
            'hour_bucket' => $hourBucket,
            'sqlsrv' => $sqlsrv,
            'supabase' => $supabase,
        ]);
    }

    /**
     * @param  list<string>|null  $cranes  Cranes the clicked bar shows nonzero moves
     *                                     for, as sent by the frontend. Null means the
     *                                     request omitted it (unknown - falls back to
     *                                     every QC crane); an empty array means the bar
     *                                     genuinely has zero QC-crane moves this hour,
     *                                     so Supabase is skipped rather than queried.
     * @return list<array{model: string, move_count: int, locations: string, drivers: string}>
     */
    private function fetchSupabaseTruckModelCounts(Carbon $windowStart, Carbon $windowEnd, ?array $cranes): array
    {
        if ($cranes === []) {
            return [];
        }

        $url = config('services.supabase.url');
        $anonKey = config('services.supabase.anon_key');

        if (! $url || ! $anonKey) {
            throw new RuntimeException('Supabase is not configured.');
        }

        $craneFilter = implode(',', array_map(
            fn (string $crane) => rawurlencode($crane),
            $cranes ?? ['QC1', 'QC2', 'QC3', 'QC4']
        ));

        // accomplishments.created_at is UTC, unlike every other datetime this
        // controller deals with - convert the Manila-local window before filtering.
        $query = http_build_query([
            // users!accomplishments_driver_id_fkey disambiguates - accomplishments has
            // two FKs to users (driver_id and clerk_id), so a bare users(...) embed
            // fails with PGRST201 ("more than one relationship was found").
            'select' => 'truck:trucks(model),location:locations!inner(name),driver:users!accomplishments_driver_id_fkey(full_name)',
        ]).'&location.name=in.('.$craneFilter.')'
            .'&created_at=gte.'.rawurlencode($windowStart->copy()->utc()->toIso8601String())
            .'&created_at=lt.'.rawurlencode($windowEnd->copy()->utc()->toIso8601String());

        $rows = Http::withHeaders([
            'apikey' => $anonKey,
            'Authorization' => 'Bearer '.$anonKey,
        ])->get(rtrim($url, '/')."/rest/v1/accomplishments?{$query}")
            ->throw()
            ->json() ?? [];

        $counts = [];
        $locationsByModel = [];
        $driversByModel = [];

        foreach ($rows as $row) {
            $model = (string) ($this->embeddedValue($row, 'truck', 'model') ?? 'Unknown');
            $location = $this->embeddedValue($row, 'location', 'name');
            $driver = $this->embeddedValue($row, 'driver', 'full_name');

            $counts[$model] = ($counts[$model] ?? 0) + 1;

            if ($location !== null && ! in_array($location, $locationsByModel[$model] ?? [], true)) {
                $locationsByModel[$model][] = $location;
            }

            if ($driver !== null && ! in_array($driver, $driversByModel[$model] ?? [], true)) {
                $driversByModel[$model][] = $driver;
            }
        }

        arsort($counts);

        $result = [];

        foreach ($counts as $model => $count) {
            $locations = $locationsByModel[$model] ?? [];
            sort($locations);

            $drivers = $driversByModel[$model] ?? [];
            sort($drivers);

            $result[] = [
                'model' => $model,
                'move_count' => $count,
                'locations' => implode(', ', $locations),
                'drivers' => implode(', ', $drivers),
            ];
        }

        return $result;
    }

    /**
     * Reads a field off a PostgREST embedded-resource value. When PostgREST
     * can't resolve the relationship as strictly many-to-one it embeds the
     * resource as a single-element array instead of an object - this reads
     * either shape so the caller doesn't have to care which one came back.
     *
     * @param  array<string, mixed>  $row
     */
    private function embeddedValue(array $row, string $key, string $field): ?string
    {
        $value = $row[$key] ?? null;

        if (! is_array($value)) {
            return null;
        }

        if (array_is_list($value)) {
            $value = $value[0] ?? null;
        }

        return is_array($value) ? ($value[$field] ?? null) : null;
    }
}
