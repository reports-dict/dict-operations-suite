<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Models\VesselPlanOverride;
use App\Models\VesselSchedule;
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
            'logs' => VesselSyncLog::orderByDesc('ran_at')->paginate(10),
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

    /**
     * A row with matched_ob_ib_id set is SPARCS-linked - VesselScheduleSyncService
     * owns every field but estimated_moves for those (see its docblock), so
     * only estimated_moves is accepted here for them. This is a server-side
     * backstop for the same restriction the Management form already applies
     * client-side (ScheduleForm renders an estimated-moves-only mini form
     * for linked rows) - a stale tab shouldn't be able to overwrite
     * sync-owned fields.
     */
    public function storeSchedule(Request $request): RedirectResponse
    {
        $id = $request->input('id');
        $existing = $id ? VesselSchedule::find($id) : null;

        if ($existing && $existing->matched_ob_ib_id) {
            $validated = $request->validate(['estimated_moves' => 'required|integer|min:0']);
            $existing->update($validated);

            return back();
        }

        $validated = $request->validate([
            'id' => 'nullable|integer',
            'service' => 'required|string|max:255',
            'line_operator' => 'required|string|max:255',
            'vessel_name' => 'required|string|max:255',
            'etb' => 'required|date',
            'etd' => 'required|date|after:etb',
            'estimated_moves' => 'required|integer|min:0',
            'loa_meters' => 'required|numeric|min:0',
            'berth_number' => 'nullable|string|max:50',
        ]);
        unset($validated['id']);

        $existing ? $existing->update($validated) : VesselSchedule::create($validated);

        return back();
    }

    public function destroySchedule(int $id): RedirectResponse
    {
        VesselSchedule::destroy($id);

        return back();
    }

    /**
     * Manual escape hatch for the automatic on-dock/departed name-matching
     * in VesselDashboardDataController - a schedule's vessel_name not
     * matching sparcsn4 exactly (typo, abbreviation, naming difference)
     * would otherwise have no recovery path.
     */
    public function updateScheduleStatus(Request $request, int $id): RedirectResponse
    {
        $validated = $request->validate([
            'status' => 'required|in:scheduled,on_dock,departed',
            // Optional - supplied by Management's "Link to Vessel" picker so a
            // manually-forced on_dock still has a real matched_ob_ib_id, and
            // therefore still auto-transitions to departed later the same way
            // an auto-matched entry does. Ignored for scheduled/departed.
            'matched_ob_ib_id' => 'nullable|string|max:255',
        ]);

        $update = ['status' => $validated['status']];

        match ($validated['status']) {
            // Reset clears the match so the entry is eligible for fresh
            // auto-matching again rather than staying pinned to a stale one.
            'scheduled' => $update += ['matched_ob_ib_id' => null, 'on_dock_at' => null, 'departed_at' => null],
            'on_dock' => $update += [
                'matched_ob_ib_id' => $validated['matched_ob_ib_id'] ?? null,
                'on_dock_at' => now(),
                'departed_at' => null,
            ],
            'departed' => $update += ['departed_at' => now()],
        };

        VesselSchedule::whereKey($id)->update($update);

        return back();
    }
}
