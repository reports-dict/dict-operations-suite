<?php

use App\Models\Driver;
use App\Models\Truck;
use App\Models\TruckAssignment;
use App\Models\User;
use App\Services\Operations\DriverAssignment\TruckAssignmentService;
use Illuminate\Validation\ValidationException;

beforeEach(function () {
    $this->actor = User::query()->where('username', 'kmorbita')->firstOrFail();
});

afterEach(function () {
    TruckAssignment::query()->whereHas('driver', fn ($q) => $q->where('employee_id', 'like', 'test-ta-%'))->delete();
    Truck::query()->where('truck_number', 'like', 'TEST-TA-%')->forceDelete();
    Driver::query()->where('employee_id', 'like', 'test-ta-%')->delete();
});

it('assigns an on-duty driver to a truck', function () {
    $truck = Truck::create(['truck_number' => 'TEST-TA-1']);
    $driver = Driver::create(['employee_id' => 'test-ta-1', 'full_name' => 'Driver One', 'is_active' => true, 'on_duty' => true]);

    $assignment = app(TruckAssignmentService::class)->assign($truck, $driver, $this->actor);

    expect($assignment->truck_id)->toBe($truck->id);
    expect($assignment->driver_id)->toBe($driver->id);
    expect($assignment->ended_at)->toBeNull();
});

it('rejects assigning a driver who is not on duty', function () {
    $truck = Truck::create(['truck_number' => 'TEST-TA-2']);
    $driver = Driver::create(['employee_id' => 'test-ta-2', 'full_name' => 'Off Duty Driver', 'is_active' => true, 'on_duty' => false]);

    app(TruckAssignmentService::class)->assign($truck, $driver, $this->actor);
})->throws(ValidationException::class);

it('ends the previous assignment when a truck is reassigned to a different driver', function () {
    $truck = Truck::create(['truck_number' => 'TEST-TA-3']);
    $driverA = Driver::create(['employee_id' => 'test-ta-3a', 'full_name' => 'Driver A', 'is_active' => true, 'on_duty' => true]);
    $driverB = Driver::create(['employee_id' => 'test-ta-3b', 'full_name' => 'Driver B', 'is_active' => true, 'on_duty' => true]);

    $service = app(TruckAssignmentService::class);
    $first = $service->assign($truck, $driverA, $this->actor);
    $second = $service->assign($truck, $driverB, $this->actor);

    $first->refresh();
    expect($first->ended_at)->not->toBeNull();
    expect($first->end_reason)->toBe('reassigned_truck');
    expect($second->ended_at)->toBeNull();

    expect(TruckAssignment::where('truck_id', $truck->id)->whereNull('ended_at')->count())->toBe(1);
});

it('ends the driver\'s other active assignment when reassigned to a different truck', function () {
    $truckA = Truck::create(['truck_number' => 'TEST-TA-4A']);
    $truckB = Truck::create(['truck_number' => 'TEST-TA-4B']);
    $driver = Driver::create(['employee_id' => 'test-ta-4', 'full_name' => 'Driver Moves Trucks', 'is_active' => true, 'on_duty' => true]);

    $service = app(TruckAssignmentService::class);
    $first = $service->assign($truckA, $driver, $this->actor);
    $second = $service->assign($truckB, $driver, $this->actor);

    $first->refresh();
    expect($first->ended_at)->not->toBeNull();
    expect($first->end_reason)->toBe('reassigned_driver');
    expect($second->ended_at)->toBeNull();

    expect(TruckAssignment::where('driver_id', $driver->id)->whereNull('ended_at')->count())->toBe(1);
});

it('unassigns a truck, ending its active assignment', function () {
    $truck = Truck::create(['truck_number' => 'TEST-TA-5']);
    $driver = Driver::create(['employee_id' => 'test-ta-5', 'full_name' => 'Driver Five', 'is_active' => true, 'on_duty' => true]);

    $service = app(TruckAssignmentService::class);
    $assignment = $service->assign($truck, $driver, $this->actor);
    $service->unassign($truck, $this->actor);

    $assignment->refresh();
    expect($assignment->ended_at)->not->toBeNull();
    expect($assignment->end_reason)->toBe('manual_unassign');
});

it('does nothing when unassigning a truck with no active assignment', function () {
    $truck = Truck::create(['truck_number' => 'TEST-TA-6']);

    app(TruckAssignmentService::class)->unassign($truck, $this->actor);

    expect(TruckAssignment::where('truck_id', $truck->id)->count())->toBe(0);
});
