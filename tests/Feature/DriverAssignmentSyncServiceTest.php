<?php

use App\Models\BigQuerySyncLog;
use App\Models\Driver;
use App\Models\Truck;
use App\Models\TruckAssignment;
use App\Services\Operations\DriverAssignment\Contracts\BigQueryClient;
use App\Services\Operations\DriverAssignment\DriverAssignmentSyncService;
use Tests\Support\FakeBigQueryClient;

beforeEach(function () {
    $this->fakeBigQuery = new FakeBigQueryClient;
    app()->instance(BigQueryClient::class, $this->fakeBigQuery);
    // RefreshDatabase is off for this app (tests run against the real dev
    // DB) - watermark the log table so afterEach can purge only rows this
    // test creates, not real sync history.
    $this->syncLogWatermark = BigQuerySyncLog::max('id') ?? 0;
    // Both syncMasterlist() and syncOnDutyStatus() operate on *every*
    // is_active driver, not just test-created ones - real production
    // behavior (each BigQuery fetch is expected to cover every driver), but
    // a fake response scoped to one test driver still trips those passes
    // for every real driver too: syncMasterlist's "dropped from masterlist"
    // deactivation loop marks every real driver absent from the tiny fake
    // response as deactivated (and auto-unassigns their truck), and
    // syncOnDutyStatus's reset pass clears on_duty for all of them. Snapshot
    // real state here so afterEach can put it back, so running this suite
    // can't corrupt live-adjacent data.
    $this->driverSnapshot = Driver::query()->get(['id', 'is_active', 'on_duty', 'on_duty_since'])->keyBy('id');
    $this->assignmentSnapshot = TruckAssignment::query()->get(['id', 'ended_at', 'end_reason'])->keyBy('id');
});

afterEach(function () {
    TruckAssignment::query()->whereHas('driver', fn ($q) => $q->where('employee_id', 'like', 'test-da-%'))->delete();
    Truck::query()->where('truck_number', 'like', 'TEST-DA-%')->forceDelete();
    Driver::query()->where('employee_id', 'like', 'test-da-%')->delete();
    BigQuerySyncLog::query()->where('id', '>', $this->syncLogWatermark)->delete();

    foreach ($this->driverSnapshot as $id => $snapshot) {
        Driver::whereKey($id)->update([
            'is_active' => $snapshot->is_active,
            'on_duty' => $snapshot->on_duty,
            'on_duty_since' => $snapshot->on_duty_since,
        ]);
    }

    foreach ($this->assignmentSnapshot as $id => $snapshot) {
        TruckAssignment::whereKey($id)->update([
            'ended_at' => $snapshot->ended_at,
            'end_reason' => $snapshot->end_reason,
        ]);
    }
});

it('creates new drivers and updates existing ones from the masterlist', function () {
    Driver::create([
        'employee_id' => 'test-da-1',
        'full_name' => 'Old Name',
        'designation' => 'Prime Mover Driver',
        'is_active' => true,
    ]);

    $this->fakeBigQuery->respondWith('EmployeeStatus', [
        ['EmployeeID' => 'test-da-1', 'FullName' => 'Updated Name', 'Designation' => 'Prime Mover Driver'],
        ['EmployeeID' => 'test-da-2', 'FullName' => 'Brand New Driver', 'Designation' => 'Prime Mover Driver'],
    ]);

    $service = app(DriverAssignmentSyncService::class);
    $log = $service->syncMasterlist('manual');

    expect($log->status)->toBe('success');
    expect($log->rows_synced)->toBe(2);

    $existing = Driver::where('employee_id', 'test-da-1')->firstOrFail();
    expect($existing->full_name)->toBe('Updated Name');
    expect($existing->is_active)->toBeTrue();

    $created = Driver::where('employee_id', 'test-da-2')->firstOrFail();
    expect($created->full_name)->toBe('Brand New Driver');
});

it('deactivates drivers dropped from the masterlist and auto-unassigns their truck', function () {
    $driver = Driver::create([
        'employee_id' => 'test-da-3',
        'full_name' => 'Dropped Driver',
        'is_active' => true,
        'on_duty' => true,
    ]);
    $truck = Truck::create(['truck_number' => 'TEST-DA-1']);
    TruckAssignment::create(['truck_id' => $truck->id, 'driver_id' => $driver->id, 'assigned_at' => now()]);

    $this->fakeBigQuery->respondWith('EmployeeStatus', [
        // test-da-3 absent from this fetch -> should be deactivated
        ['EmployeeID' => 'test-da-other', 'FullName' => 'Someone Else', 'Designation' => 'Prime Mover Driver'],
    ]);

    app(DriverAssignmentSyncService::class)->syncMasterlist('manual');

    $driver->refresh();
    expect($driver->is_active)->toBeFalse();
    expect($driver->on_duty)->toBeFalse();

    $assignment = TruckAssignment::where('truck_id', $truck->id)->firstOrFail();
    expect($assignment->ended_at)->not->toBeNull();
    expect($assignment->end_reason)->toBe('driver_deactivated');

    Driver::where('employee_id', 'test-da-other')->delete();
});

it('does not touch any driver row when the masterlist fetch throws', function () {
    $driver = Driver::create(['employee_id' => 'test-da-4', 'full_name' => 'Untouched', 'is_active' => true]);

    $this->fakeBigQuery->throwFor('EmployeeStatus', new RuntimeException('BigQuery is down'));

    $log = app(DriverAssignmentSyncService::class)->syncMasterlist('manual');

    expect($log->status)->toBe('failed');
    expect($log->error_message)->toContain('BigQuery is down');

    $driver->refresh();
    expect($driver->full_name)->toBe('Untouched');
    expect($driver->is_active)->toBeTrue();
});

it('does not deactivate any driver when the masterlist returns zero rows', function () {
    $driver = Driver::create(['employee_id' => 'test-da-5', 'full_name' => 'Should Stay Active', 'is_active' => true]);

    $this->fakeBigQuery->respondWith('EmployeeStatus', []);

    $log = app(DriverAssignmentSyncService::class)->syncMasterlist('manual');

    expect($log->status)->toBe('failed'); // zero rows treated as a suspicious/failed sync

    $driver->refresh();
    expect($driver->is_active)->toBeTrue();
});

it('marks a driver on-duty when they have an IN scan with no matching OUT this shift', function () {
    $driver = Driver::create(['employee_id' => 'test-da-6', 'full_name' => 'Clocked In', 'is_active' => true]);

    $this->fakeBigQuery->respondWith('bio_timelog_logistic', [
        ['EmployeeID' => 'test-da-6', 'BiometricTime' => '2026-07-28 07:05:00', 'LogType' => 'IN'],
    ]);

    $log = app(DriverAssignmentSyncService::class)->syncOnDutyStatus('manual');

    expect($log->status)->toBe('success');

    $driver->refresh();
    expect($driver->on_duty)->toBeTrue();
    expect($driver->on_duty_since)->not->toBeNull();
});

it('does not mark a driver on-duty when they already have a matching OUT scan this shift', function () {
    $driver = Driver::create(['employee_id' => 'test-da-7', 'full_name' => 'Clocked Out', 'is_active' => true, 'on_duty' => true]);

    $this->fakeBigQuery->respondWith('bio_timelog_logistic', [
        ['EmployeeID' => 'test-da-7', 'BiometricTime' => '2026-07-28 07:05:00', 'LogType' => 'IN'],
        ['EmployeeID' => 'test-da-7', 'BiometricTime' => '2026-07-28 15:00:00', 'LogType' => 'OUT'],
    ]);

    app(DriverAssignmentSyncService::class)->syncOnDutyStatus('manual');

    $driver->refresh();
    expect($driver->on_duty)->toBeFalse();
});

it('skips attendance rows for an employee_id with no matching driver, without crashing', function () {
    $this->fakeBigQuery->respondWith('bio_timelog_logistic', [
        ['EmployeeID' => 'test-da-unknown', 'BiometricTime' => '2026-07-28 07:05:00', 'LogType' => 'IN'],
    ]);

    $log = app(DriverAssignmentSyncService::class)->syncOnDutyStatus('manual');

    expect($log->status)->toBe('success');
});

it('does not touch any driver row when the attendance fetch throws', function () {
    $driver = Driver::create(['employee_id' => 'test-da-8', 'full_name' => 'Untouched', 'is_active' => true, 'on_duty' => true]);

    $this->fakeBigQuery->throwFor('bio_timelog_logistic', new RuntimeException('BigQuery is down'));

    $log = app(DriverAssignmentSyncService::class)->syncOnDutyStatus('manual');

    expect($log->status)->toBe('failed');

    $driver->refresh();
    expect($driver->on_duty)->toBeTrue();
});
