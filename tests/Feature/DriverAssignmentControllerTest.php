<?php

use App\Models\BigQuerySyncLog;
use App\Models\Driver;
use App\Models\Truck;
use App\Models\TruckAssignment;
use App\Models\User;
use App\Services\Operations\DriverAssignment\Contracts\BigQueryClient;
use Illuminate\Support\Str;
use Tests\Support\FakeBigQueryClient;

beforeEach(function () {
    $this->fakeBigQuery = new FakeBigQueryClient;
    app()->instance(BigQueryClient::class, $this->fakeBigQuery);
    // RefreshDatabase is off for this app (tests run against the real dev
    // DB) - watermark the log table so afterEach can purge only rows this
    // test creates, not real sync history (the fetch-now test below writes
    // real bigquery_sync_logs rows).
    $this->syncLogWatermark = BigQuerySyncLog::max('id') ?? 0;
});

afterEach(function () {
    User::query()->where('username', 'like', 'da-ctrl-test-%')->delete();
    TruckAssignment::query()->whereHas('driver', fn ($q) => $q->where('employee_id', 'like', 'test-ctrl-%'))->delete();
    Truck::query()->where('truck_number', 'like', 'TEST-CTRL-%')->forceDelete();
    Driver::query()->where('employee_id', 'like', 'test-ctrl-%')->delete();
    BigQuerySyncLog::query()->where('id', '>', $this->syncLogWatermark)->delete();
});

it('redirects guests to login', function () {
    $this->get('/operations/driver-assignment')->assertRedirect('/login');
});

it('blocks a user without the module permission with a 403', function () {
    $user = new User;
    $user->name = 'DA Ctrl Test User';
    $user->username = 'da-ctrl-test-'.Str::random(8);
    $user->email = Str::random(8).'@example.test';
    $user->is_allowed = true;
    $user->save();
    $user->assignRole('bdd');

    $this->actingAs($user)->get('/operations/driver-assignment')->assertForbidden();
});

it('renders the index page for an allowed superadmin', function () {
    $user = User::query()->where('username', 'kmorbita')->firstOrFail();

    $this->actingAs($user)
        ->get('/operations/driver-assignment')
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('Operations/DriverAssignment/Index')
            ->has('trucks')
            ->has('onDutyDrivers')
            ->has('lastSync'));
});

it('creates a truck', function () {
    $user = User::query()->where('username', 'kmorbita')->firstOrFail();

    $this->actingAs($user)
        ->post('/operations/driver-assignment/trucks', ['truck_number' => 'TEST-CTRL-1'])
        ->assertRedirect();

    expect(Truck::where('truck_number', 'TEST-CTRL-1')->exists())->toBeTrue();
});

it('rejects a duplicate truck number among active trucks', function () {
    Truck::create(['truck_number' => 'TEST-CTRL-2']);
    $user = User::query()->where('username', 'kmorbita')->firstOrFail();

    $this->actingAs($user)
        ->post('/operations/driver-assignment/trucks', ['truck_number' => 'TEST-CTRL-2'])
        ->assertSessionHasErrors('truck_number');
});

it('updates a truck number', function () {
    $truck = Truck::create(['truck_number' => 'TEST-CTRL-3']);
    $user = User::query()->where('username', 'kmorbita')->firstOrFail();

    $this->actingAs($user)
        ->put("/operations/driver-assignment/trucks/{$truck->id}", ['truck_number' => 'TEST-CTRL-3B'])
        ->assertRedirect();

    expect($truck->fresh()->truck_number)->toBe('TEST-CTRL-3B');
});

it('soft-deletes a truck and ends its active assignment', function () {
    $truck = Truck::create(['truck_number' => 'TEST-CTRL-4']);
    $driver = Driver::create(['employee_id' => 'test-ctrl-4', 'full_name' => 'Driver Four', 'is_active' => true, 'on_duty' => true]);
    $assignment = TruckAssignment::create(['truck_id' => $truck->id, 'driver_id' => $driver->id, 'assigned_at' => now()]);
    $user = User::query()->where('username', 'kmorbita')->firstOrFail();

    $this->actingAs($user)
        ->delete("/operations/driver-assignment/trucks/{$truck->id}")
        ->assertRedirect();

    expect(Truck::withTrashed()->find($truck->id)->trashed())->toBeTrue();
    $assignment->refresh();
    expect($assignment->ended_at)->not->toBeNull();
});

it('assigns an on-duty driver to a truck', function () {
    $truck = Truck::create(['truck_number' => 'TEST-CTRL-5']);
    $driver = Driver::create(['employee_id' => 'test-ctrl-5', 'full_name' => 'Driver Five', 'is_active' => true, 'on_duty' => true]);
    $user = User::query()->where('username', 'kmorbita')->firstOrFail();

    $this->actingAs($user)
        ->post("/operations/driver-assignment/trucks/{$truck->id}/assign", ['driver_id' => $driver->id])
        ->assertRedirect();

    expect(TruckAssignment::where('truck_id', $truck->id)->whereNull('ended_at')->exists())->toBeTrue();
});

it('rejects assigning an off-duty driver', function () {
    $truck = Truck::create(['truck_number' => 'TEST-CTRL-6']);
    $driver = Driver::create(['employee_id' => 'test-ctrl-6', 'full_name' => 'Off Duty', 'is_active' => true, 'on_duty' => false]);
    $user = User::query()->where('username', 'kmorbita')->firstOrFail();

    $this->actingAs($user)
        ->post("/operations/driver-assignment/trucks/{$truck->id}/assign", ['driver_id' => $driver->id])
        ->assertSessionHasErrors('driver_id');
});

it('unassigns a truck', function () {
    $truck = Truck::create(['truck_number' => 'TEST-CTRL-7']);
    $driver = Driver::create(['employee_id' => 'test-ctrl-7', 'full_name' => 'Driver Seven', 'is_active' => true, 'on_duty' => true]);
    $assignment = TruckAssignment::create(['truck_id' => $truck->id, 'driver_id' => $driver->id, 'assigned_at' => now()]);
    $user = User::query()->where('username', 'kmorbita')->firstOrFail();

    $this->actingAs($user)
        ->delete("/operations/driver-assignment/trucks/{$truck->id}/assign")
        ->assertRedirect();

    $assignment->refresh();
    expect($assignment->ended_at)->not->toBeNull();
});

it('runs a manual sync via the fetch-now endpoint without hitting real BigQuery', function () {
    $this->fakeBigQuery->respondWith('EmployeeStatus', []);
    $this->fakeBigQuery->respondWith('bio_timelog_logistic', []);

    $user = User::query()->where('username', 'kmorbita')->firstOrFail();

    $this->actingAs($user)
        ->post('/operations/driver-assignment/sync-now')
        ->assertRedirect();

    expect(count($this->fakeBigQuery->calls))->toBeGreaterThanOrEqual(2);
});
