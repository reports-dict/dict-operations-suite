<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Models\VesselPlanOverride;
use App\Models\VesselSchedule;
use App\Services\Operations\VesselDashboard\VesselDashboardBoardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class VesselDashboardDataController extends Controller
{
    /**
     * Minimum similar_text() percentage for a fuzzy (non-exact) name match
     * to be accepted - see findMatch(). Conservative on purpose: a false
     * match links a schedule to the wrong vessel, which is worse than
     * missing a match (the manual "Link to Vessel" picker in Management is
     * the correction path for whatever this doesn't catch).
     */
    private const FUZZY_MATCH_THRESHOLD = 90.0;

    private array $overrideFields = [
        'total_planned_discharge',
        'discharge_plan_fcl_20ft',
        'discharge_plan_fcl_40ft',
        'discharge_plan_mty_20ft',
        'discharge_plan_mty_40ft',
        'total_planned_loading_wi',
        'load_plan_fcl_20ft',
        'load_plan_fcl_40ft',
        'load_plan_empty_20ft',
        'load_plan_empty_40ft',
    ];

    /**
     * Public JSON endpoint (see routes/kiosk.php) polled every 60s by the
     * kiosk board and by the Management page's override editor. Ported from
     * vessel-dashboard-app's Api\DashboardController::data() - never surface
     * a raw exception to the unattended TV display, degrade to an empty
     * vessel list instead.
     */
    public function __invoke(VesselDashboardBoardService $boardService): JsonResponse
    {
        // Fetched independently of the sparcsn4 vessel query below - a
        // schedule-connection hiccup must never break the vessel board, and
        // conversely schedules must still be available (they're the board's
        // fallback view) even when sparcsn4 itself is unreachable.
        try {
            $schedules = VesselSchedule::orderBy('etb')->get();
        } catch (\Exception $e) {
            Log::error('Failed to fetch Vessel Schedules', ['error' => $e->getMessage()]);
            $schedules = collect();
        }

        try {
            $vessels = $boardService->fetchActiveVessels();
        } catch (\Exception $e) {
            Log::error('Failed to fetch Vessel Dashboard data', ['error' => $e->getMessage()]);

            return response()->json(['vessels' => [], 'schedules' => $schedules, 'fetched_at' => now()->toISOString()]);
        }

        $activeIds = collect($vessels)->pluck('ob_ib_id');

        // Auto-cleanup overrides for vessels no longer active
        VesselPlanOverride::whereNotIn('ob_ib_id', $activeIds)->delete();

        // Merge overrides into vessel data
        $overrides = VesselPlanOverride::all()->keyBy('ob_ib_id');

        foreach ($vessels as $vessel) {
            // Loading planned figures default to 0; only shown when explicitly overridden
            $vessel->total_planned_loading_wi = 0;
            $vessel->load_plan_fcl_20ft = 0;
            $vessel->load_plan_fcl_40ft = 0;
            $vessel->load_plan_empty_20ft = 0;
            $vessel->load_plan_empty_40ft = 0;

            $vessel->has_override = false;
            if ($override = $overrides->get($vessel->ob_ib_id)) {
                foreach ($this->overrideFields as $field) {
                    if (! is_null($override->$field)) {
                        $vessel->$field = $override->$field;
                    }
                }
                $vessel->has_override = true;
            }
        }

        // Auto-detect schedule lifecycle transitions against the live feed
        // just fetched above - scheduled -> on_dock when a name match
        // appears (exact first, then a conservative fuzzy fallback - see
        // findMatch()), on_dock -> departed when its matched vessel drops
        // out of the active list. A schedule entry has no shared key with
        // sparcsn4 until it actually arrives, so this is inherently
        // best-effort - see VesselDashboardManagementController's manual
        // "Link to Vessel" action for the correction path.
        $activeVesselsByName = collect($vessels)->keyBy(fn ($v) => mb_strtolower(trim($v->vessel_name)));
        $activeIdList = $activeIds->all();

        foreach ($schedules as $schedule) {
            if ($schedule->status === 'scheduled') {
                $match = $this->findMatch($schedule->vessel_name, $activeVesselsByName);
                if ($match) {
                    $schedule->update([
                        'status' => 'on_dock',
                        'matched_ob_ib_id' => $match->ob_ib_id,
                        'on_dock_at' => now(),
                    ]);
                }
            } elseif ($schedule->status === 'on_dock'
                && $schedule->matched_ob_ib_id
                && ! in_array($schedule->matched_ob_ib_id, $activeIdList, true)) {
                $schedule->update([
                    'status' => 'departed',
                    'departed_at' => now(),
                ]);
            }
        }

        // Fetch per-crane hourly move data for all active vessels in one batched SQL Server query
        $obIbIds = $activeIds->filter()->values()->all();
        $graphRowsByVessel = $boardService->fetchCraneGraph($obIbIds);

        $craneKeys = ['QC1', 'QC2', 'QC3', 'QC4', 'UNKR', 'ECIN'];

        foreach ($vessels as $vessel) {
            $rows = $graphRowsByVessel->get($vessel->ob_ib_id, collect());

            $vessel->graph = $rows->groupBy('hour_bucket')->map(function ($hourRows) use ($craneKeys) {
                $entry = array_merge(
                    [
                        'hour' => (int) $hourRows->first()->move_hour,
                        'hour_bucket' => (string) $hourRows->first()->hour_bucket,
                        'total' => 0,
                    ],
                    array_fill_keys($craneKeys, 0)
                );

                foreach ($hourRows as $row) {
                    if ($row->crane === null) {
                        continue; // zero-fill row for an hour with no moves at all
                    }

                    // Fold any crane name outside the known 6 into UNKR, so `total` stays
                    // accurate even if a new crane is commissioned before this list is updated.
                    $crane = in_array($row->crane, $craneKeys, true) ? $row->crane : 'UNKR';
                    $entry[$crane] += (int) $row->total;
                    $entry['total'] += (int) $row->total;
                }

                return $entry;
            })->values()->all();
        }

        return response()->json([
            'vessels' => $vessels,
            'schedules' => $schedules,
            'fetched_at' => now()->toISOString(),
        ]);
    }

    /**
     * Exact (case-insensitive/trimmed) match first; if none, falls back to
     * the best similar_text() match among currently active vessels, only
     * accepted at or above FUZZY_MATCH_THRESHOLD - catches a typo/naming
     * variation between a manually-typed schedule entry and the real
     * SPARCS name without risking a confident-looking wrong match.
     *
     * @param  Collection<string, object>  $activeVesselsByName  keyed by lowercased/trimmed vessel_name
     */
    private function findMatch(string $scheduleName, Collection $activeVesselsByName): ?object
    {
        $needle = mb_strtolower(trim($scheduleName));

        if ($exact = $activeVesselsByName->get($needle)) {
            return $exact;
        }

        $best = null;
        $bestPercent = 0.0;

        foreach ($activeVesselsByName as $candidateName => $vessel) {
            similar_text($needle, $candidateName, $percent);
            if ($percent > $bestPercent) {
                $bestPercent = $percent;
                $best = $vessel;
            }
        }

        return $bestPercent >= self::FUZZY_MATCH_THRESHOLD ? $best : null;
    }
}
