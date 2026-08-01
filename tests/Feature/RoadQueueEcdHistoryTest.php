<?php

use App\Models\User;
use Illuminate\Support\Str;

afterEach(function () {
    User::query()->where('username', 'like', 'rq-ecd-history-test-%')->delete();
});

it('redirects guests to login', function () {
    $this->get('/operations/road-queue-ecd/history')->assertRedirect('/login');
});

it('renders the history dashboard for an allowed superadmin', function () {
    $user = User::query()->where('username', 'kmorbita')->firstOrFail();

    $this->actingAs($user)
        ->get('/operations/road-queue-ecd/history')
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('Operations/RoadQueueEcd/History')
            ->has('tatHistory.data')
            ->has('transactions.data'));
});

it('blocks a user without the module permission with a 403', function () {
    $user = new User;
    $user->name = 'RQ ECD History Test User';
    $user->username = 'rq-ecd-history-test-'.Str::random(8);
    $user->email = Str::random(8).'@example.test';
    $user->is_allowed = true;
    $user->save();
    $user->assignRole('bdd');

    $this->actingAs($user)->get('/operations/road-queue-ecd/history')->assertForbidden();
});

it('lets a user without the module permission still reach the public board', function () {
    $user = new User;
    $user->name = 'RQ ECD History Test User';
    $user->username = 'rq-ecd-history-test-'.Str::random(8);
    $user->email = Str::random(8).'@example.test';
    $user->is_allowed = true;
    $user->save();
    $user->assignRole('bdd');

    $this->actingAs($user)->get('/operations/road-queue-ecd/board')->assertSuccessful();
});

it('exports TAT history as CSV', function () {
    $user = User::query()->where('username', 'kmorbita')->firstOrFail();

    $response = $this->actingAs($user)->get('/operations/road-queue-ecd/history/export/tat');

    $response->assertSuccessful();
    expect($response->headers->get('Content-Type'))->toContain('text/csv');
});

it('exports high-elapsed transactions as CSV', function () {
    $user = User::query()->where('username', 'kmorbita')->firstOrFail();

    $response = $this->actingAs($user)->get('/operations/road-queue-ecd/history/export/transactions');

    $response->assertSuccessful();
    expect($response->headers->get('Content-Type'))->toContain('text/csv');
});
