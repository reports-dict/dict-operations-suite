<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Models\VesselPlanOverride;
use App\Services\Operations\VesselDashboard\VesselDashboardBoardService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class VesselDashboardDataController extends Controller
{
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
        try {
            $vessels = $boardService->fetchActiveVessels();
        } catch (\Exception $e) {
            Log::error('Failed to fetch Vessel Dashboard data', ['error' => $e->getMessage()]);

            return response()->json(['vessels' => [], 'fetched_at' => now()->toISOString()]);
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

        // Fetch per-crane hourly move data for all active vessels in one batched SQL Server query
        $obIbIds = $activeIds->filter()->values()->all();
        $graphRowsByVessel = $boardService->fetchCraneGraph($obIbIds);

        $craneKeys = ['QC1', 'QC2', 'QC3', 'QC4', 'UNKR', 'ECIN'];

        foreach ($vessels as $vessel) {
            $rows = $graphRowsByVessel->get($vessel->ob_ib_id, collect());

            $vessel->graph = $rows->groupBy('hour_bucket')->map(function ($hourRows) use ($craneKeys) {
                $entry = array_merge(
                    ['hour' => (int) $hourRows->first()->move_hour, 'total' => 0],
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
            'fetched_at' => now()->toISOString(),
        ]);
    }
}
