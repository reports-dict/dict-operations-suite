<?php

use App\Models\User;
use App\Services\Operations\DriverAssignment\Contracts\BigQueryClient;
use Illuminate\Support\Str;
use Tests\Support\FakeBigQueryClient;

beforeEach(function () {
    $this->fakeBigQuery = new FakeBigQueryClient;
    app()->instance(BigQueryClient::class, $this->fakeBigQuery);
});

afterEach(function () {
    User::query()->where('username', 'like', 'da-logs-test-%')->delete();
});

it('redirects guests to login', function () {
    $this->get('/operations/driver-assignment/logs')->assertRedirect('/login');
});

it('blocks a user with only the base driver-assignment permission', function () {
    $user = new User;
    $user->name = 'DA Logs Test User';
    $user->username = 'da-logs-test-'.Str::random(8);
    $user->email = Str::random(8).'@example.test';
    $user->is_allowed = true;
    $user->save();
    $user->assignRole('bdd');
    $user->givePermissionTo('operations.driver-assignment.view');

    $this->actingAs($user)->get('/operations/driver-assignment/logs')->assertForbidden();
});

it('renders the logs page for a user granted the logs permission', function () {
    $user = new User;
    $user->name = 'DA Logs Test User';
    $user->username = 'da-logs-test-'.Str::random(8);
    $user->email = Str::random(8).'@example.test';
    $user->is_allowed = true;
    $user->save();
    $user->assignRole('bdd');
    $user->givePermissionTo('operations.driver-assignment-logs.view');

    $this->actingAs($user)
        ->get('/operations/driver-assignment/logs')
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('Operations/DriverAssignment/Logs')
            ->has('rows'));
});

it('never queries BigQuery until both start and end are supplied', function () {
    $user = User::query()->where('username', 'kmorbita')->firstOrFail();

    $this->actingAs($user)
        ->get('/operations/driver-assignment/logs')
        ->assertSuccessful();

    expect($this->fakeBigQuery->calls)->toBe([]);
});

it('rejects a range wider than 31 days without querying', function () {
    $user = User::query()->where('username', 'kmorbita')->firstOrFail();

    $response = $this->actingAs($user)->get('/operations/driver-assignment/logs?'.http_build_query([
        'start_datetime' => '2026-01-01T00:00',
        'end_datetime' => '2026-03-01T00:00',
    ]));

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page->where('error', fn ($error) => is_string($error) && str_contains($error, '31 days')));
    expect($this->fakeBigQuery->calls)->toBe([]);
});

it('filters by log type', function () {
    $this->fakeBigQuery->respondWith('bio_timelog_logistic', [
        ['EmployeeID' => '1001', 'FullName' => 'Doe, John', 'Location' => 'TERMINAL', 'Department' => 'Ops', 'Section' => 'A', 'Designation' => 'Prime Mover Driver', 'LogDateTime' => '2026-08-01 07:00:00', 'LogType' => 'IN'],
    ]);

    $user = User::query()->where('username', 'kmorbita')->firstOrFail();

    $response = $this->actingAs($user)->get('/operations/driver-assignment/logs?'.http_build_query([
        'start_datetime' => '2026-08-01T00:00',
        'end_datetime' => '2026-08-02T00:00',
        'log_type' => 'IN',
    ]));

    $response->assertSuccessful();

    $rows = $response->viewData('page')['props']['rows'];
    expect(collect($rows)->pluck('log_type')->unique()->all())->toBe(['IN']);

    $lastCall = end($this->fakeBigQuery->calls);
    expect($lastCall['parameters']['log_type'])->toBe(0);
});
