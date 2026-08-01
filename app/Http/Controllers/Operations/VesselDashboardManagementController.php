<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Models\VesselPlanOverride;
use App\Models\VesselSyncLog;
use App\Models\VesselVisit;
use App\Services\Operations\VesselDashboard\VesselVisitSyncService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VesselDashboardManagementController extends Controller
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

    public function index(): Response
    {
        $totalVisits = VesselVisit::count();
        $lastSync = VesselSyncLog::latest('ran_at')->first();

        $now = now();
        $week = $now->copy()->startOfWeek();

        $successThisWeek = VesselSyncLog::where('status', 'success')
            ->whereBetween('ran_at', [$week, $now])
            ->count();

        $failedThisWeek = VesselSyncLog::where('status', 'failed')
            ->whereBetween('ran_at', [$week, $now])
            ->count();

        return Inertia::render('Operations/VesselDashboard/Management', [
            'stats' => [
                'total_visits' => $totalVisits,
                'last_sync' => $lastSync?->ran_at?->toIso8601String(),
                'last_sync_status' => $lastSync?->status,
                'success_this_week' => $successThisWeek,
                'failed_this_week' => $failedThisWeek,
            ],
            'logs' => VesselSyncLog::orderByDesc('ran_at')->paginate(20),
        ]);
    }

    public function storeOverride(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ob_ib_id' => 'required|string',
            ...(array_fill_keys($this->overrideFields, 'nullable|integer|min:0')),
        ]);

        VesselPlanOverride::updateOrCreate(
            ['ob_ib_id' => $validated['ob_ib_id']],
            $validated
        );

        return back();
    }

    public function destroyOverride(string $obIbId): RedirectResponse
    {
        VesselPlanOverride::where('ob_ib_id', $obIbId)->delete();

        return back();
    }

    public function syncNow(VesselVisitSyncService $service): RedirectResponse
    {
        $service->sync('manual');

        return back();
    }
}
