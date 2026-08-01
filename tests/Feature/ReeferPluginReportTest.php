<?php

use App\Models\User;

it('redirects guests to login', function () {
    $this->get('/operations/reefer-plugin-report/per-container')->assertRedirect('/login');
});

it('renders the report for an allowed superadmin', function () {
    $user = User::query()->where('username', 'kmorbita')->firstOrFail();

    $this->actingAs($user)
        ->get('/operations/reefer-plugin-report/per-container')
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('Operations/ReeferPluginReport/Index')
            ->has('rows.data')
            ->where('filters.category', 'both'));
});

it('filters by category and flags duplicate container visits', function () {
    $user = User::query()->where('username', 'kmorbita')->firstOrFail();

    $response = $this->actingAs($user)->get('/operations/reefer-plugin-report/per-container?category=imprt&sort=container&direction=asc');

    $response->assertSuccessful();

    $rows = $response->viewData('page')['props']['rows']['data'];

    expect(collect($rows)->pluck('category')->unique()->all())->toBe(['IMPRT']);

    $duplicateVisits = collect($rows)->where('container', 'MSCU1234567')->pluck('visit_index')->all();
    expect($duplicateVisits)->toBe([1, 2, 3]);
});
