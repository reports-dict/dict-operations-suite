<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Models\YardAllocation;
use App\Models\YardBlock;
use App\Models\YardContainer;
use App\Models\YardSyncLog;
use App\Services\Operations\ContainerYard\ContainerYardSyncService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Sync health (mirrors VesselDashboardManagementController::index()) plus
 * plain resource CRUD for Blocks and Allocations - no separate service
 * layer for the CRUD itself, following DriverAssignmentController's
 * precedent. Validation rules ported from local-simplified-xps-v2's
 * Api\BlockController and Api\AllocationController.
 */
class ContainerYardManagementController extends Controller
{
    public function index(): Response
    {
        $totalContainers = YardContainer::count();
        $lastSync = YardSyncLog::latest('ran_at')->first();

        $now = now();
        $week = $now->copy()->startOfWeek();

        $successThisWeek = YardSyncLog::where('status', 'success')
            ->whereBetween('ran_at', [$week, $now])
            ->count();

        $failedThisWeek = YardSyncLog::where('status', 'error')
            ->whereBetween('ran_at', [$week, $now])
            ->count();

        return Inertia::render('Operations/ContainerYard/Management', [
            'stats' => [
                'total_containers' => $totalContainers,
                'total_blocks' => YardBlock::count(),
                'total_allocations' => YardAllocation::count(),
                'last_sync' => $lastSync?->ran_at?->toIso8601String(),
                'last_sync_status' => $lastSync?->status,
                'success_this_week' => $successThisWeek,
                'failed_this_week' => $failedThisWeek,
            ],
            'logs' => YardSyncLog::orderByDesc('ran_at')->paginate(10, ['*'], 'logs_page'),
            'blocks' => YardBlock::orderBy('name')->paginate(10, ['*'], 'blocks_page'),
            'allocations' => YardAllocation::orderBy('service')->orderBy('discharge_port')->paginate(10, ['*'], 'allocations_page'),
        ]);
    }

    public function syncNow(ContainerYardSyncService $service): RedirectResponse
    {
        $service->sync('manual');

        return back();
    }

    public function storeBlock(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|unique:yard_blocks,name',
            'bay_start' => 'required|integer|min:1',
            'bay_end' => 'required|integer|min:1|gte:bay_start',
            'row_start' => 'required|string|regex:/^[A-Z]$/',
            'row_end' => 'required|string|regex:/^[A-Z]$/',
            'max_tier' => 'required|integer|min:1|max:10',
            'facility' => 'required|in:'.implode(',', YardBlock::FACILITIES),
            'road_side' => 'sometimes|in:row_start,row_end,both',
            'is_active' => 'sometimes|boolean',
            'excluded_rows' => 'sometimes|nullable|string',
        ]);

        YardBlock::create($validated);

        return back();
    }

    public function updateBlock(Request $request, YardBlock $block): RedirectResponse
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|unique:yard_blocks,name,'.$block->id,
            'bay_start' => 'sometimes|required|integer|min:1',
            'bay_end' => 'sometimes|required|integer|min:1|gte:bay_start',
            'row_start' => 'sometimes|required|string|regex:/^[A-Z]$/',
            'row_end' => 'sometimes|required|string|regex:/^[A-Z]$/',
            'max_tier' => 'sometimes|required|integer|min:1|max:10',
            'facility' => 'sometimes|required|in:'.implode(',', YardBlock::FACILITIES),
            'road_side' => 'sometimes|in:row_start,row_end,both',
            'is_active' => 'sometimes|boolean',
            'excluded_rows' => 'sometimes|nullable|string',
        ]);

        $block->update($validated);

        return back();
    }

    public function destroyBlock(YardBlock $block): RedirectResponse
    {
        $block->delete();

        return back();
    }

    public function storeAllocation(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'service' => 'nullable|string|max:255',
            'discharge_port' => 'nullable|string|max:255',
            'iso_basic_length' => 'nullable|string|max:255',
            'reefer_type' => 'nullable|string|max:255',
            'location' => 'required|string|max:255',
        ]);

        YardAllocation::create($validated);

        return back();
    }

    public function updateAllocation(Request $request, YardAllocation $allocation): RedirectResponse
    {
        $validated = $request->validate([
            'service' => 'nullable|string|max:255',
            'discharge_port' => 'nullable|string|max:255',
            'iso_basic_length' => 'nullable|string|max:255',
            'reefer_type' => 'nullable|string|max:255',
            'location' => 'sometimes|required|string|max:255',
        ]);

        $allocation->update($validated);

        return back();
    }

    public function destroyAllocation(YardAllocation $allocation): RedirectResponse
    {
        $allocation->delete();

        return back();
    }
}
