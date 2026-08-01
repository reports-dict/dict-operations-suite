<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Models\BigQuerySyncLog;
use App\Models\Driver;
use App\Models\Truck;
use App\Services\Operations\DriverAssignment\DriverAssignmentSyncService;
use App\Services\Operations\DriverAssignment\TruckAssignmentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class DriverAssignmentController extends Controller
{
    public function __construct(
        private readonly TruckAssignmentService $assignmentService,
        private readonly DriverAssignmentSyncService $syncService,
    ) {}

    public function index(): Response
    {
        $trucks = Truck::query()
            ->with('activeAssignment.driver')
            ->orderBy('truck_number')
            ->get();

        $onDutyDrivers = Driver::query()
            ->where('is_active', true)
            ->where('on_duty', true)
            ->with('activeAssignment.truck')
            ->orderBy('full_name')
            ->get();

        $lastSync = [
            'masterlist' => BigQuerySyncLog::query()->where('sync_type', 'masterlist')->latest('id')->first(),
            'attendance' => BigQuerySyncLog::query()->where('sync_type', 'attendance')->latest('id')->first(),
        ];

        return Inertia::render('Operations/DriverAssignment/Index', [
            'trucks' => $trucks,
            'onDutyDrivers' => $onDutyDrivers,
            'lastSync' => $lastSync,
        ]);
    }

    public function storeTruck(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'truck_number' => [
                'required',
                'string',
                'max:50',
                Rule::unique('trucks', 'truck_number')->whereNull('deleted_at'),
            ],
        ]);

        Truck::create($validated);

        return back();
    }

    public function updateTruck(Request $request, Truck $truck): RedirectResponse
    {
        $validated = $request->validate([
            'truck_number' => [
                'required',
                'string',
                'max:50',
                Rule::unique('trucks', 'truck_number')->whereNull('deleted_at')->ignore($truck->id),
            ],
        ]);

        $truck->update($validated);

        return back();
    }

    public function destroyTruck(Truck $truck): RedirectResponse
    {
        $this->assignmentService->unassign($truck, Auth::user(), 'truck_deleted');
        $truck->delete();

        return back();
    }

    public function assign(Request $request, Truck $truck): RedirectResponse
    {
        $validated = $request->validate([
            'driver_id' => ['required', 'exists:drivers,id'],
        ]);

        $driver = Driver::findOrFail($validated['driver_id']);

        $this->assignmentService->assign($truck, $driver, Auth::user());

        return back();
    }

    public function unassign(Truck $truck): RedirectResponse
    {
        $this->assignmentService->unassign($truck, Auth::user());

        return back();
    }

    public function fetchNow(): RedirectResponse
    {
        $this->syncService->syncAll('manual');

        return back();
    }
}
