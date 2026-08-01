<?php

use App\Models\User;
use Illuminate\Support\Str;

afterEach(function () {
    User::query()->where('username', 'like', 'rq-history-test-%')->delete();
});

it('redirects guests to login', function () {
    $this->get('/operations/road-queue/history')->assertRedirect('/login');
});

it('renders the history dashboard for an allowed superadmin', function () {
    $user = User::query()->where('username', 'kmorbita')->firstOrFail();

    $this->actingAs($user)
        ->get('/operations/road-queue/history')
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('Operations/RoadQueue/History')
            ->has('tatHistory.data')
            ->has('transactions.data'));
});

it('blocks a user without the module permission with a 403', function () {
    $user = new User;
    $user->name = 'RQ History Test User';
    $user->username = 'rq-history-test-'.Str::random(8);
    $user->email = Str::random(8).'@example.test';
    $user->is_allowed = true;
    $user->save();
    $user->assignRole('bdd');

    $this->actingAs($user)->get('/operations/road-queue/history')->assertForbidden();
});

it('lets a user without the module permission still reach the public board', function () {
    $user = new User;
    $user->name = 'RQ History Test User';
    $user->username = 'rq-history-test-'.Str::random(8);
    $user->email = Str::random(8).'@example.test';
    $user->is_allowed = true;
    $user->save();
    $user->assignRole('bdd');

    // No auth at all needed for the board, but confirm even a logged-in user
    // lacking the permission isn't blocked by it either - the split between
    // the public board and the gated history dashboard actually works.
    $this->actingAs($user)->get('/operations/road-queue/board')->assertSuccessful();
});

it('exports TAT history as CSV', function () {
    $user = User::query()->where('username', 'kmorbita')->firstOrFail();

    $response = $this->actingAs($user)->get('/operations/road-queue/history/export/tat');

    $response->assertSuccessful();
    expect($response->headers->get('Content-Type'))->toContain('text/csv');
});

it('exports high-elapsed transactions as CSV', function () {
    $user = User::query()->where('username', 'kmorbita')->firstOrFail();

    $response = $this->actingAs($user)->get('/operations/road-queue/history/export/transactions');

    $response->assertSuccessful();
    expect($response->headers->get('Content-Type'))->toContain('text/csv');
});
