<?php

use App\Models\User;

it('redirects guests to login', function () {
    $this->get('/operations/consignees')->assertRedirect('/login');
});

it('renders the full consignee list for an allowed superadmin', function () {
    $user = User::query()->where('username', 'kmorbita')->firstOrFail();

    $this->actingAs($user)
        ->get('/operations/consignees')
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('Operations/Consignees/Index')
            ->has('rows'));
});

it('exports filtered by search', function () {
    $user = User::query()->where('username', 'kmorbita')->firstOrFail();

    $rows = $this->actingAs($user)
        ->get('/operations/consignees')
        ->viewData('page')['props']['rows'];

    if (empty($rows)) {
        return;
    }

    $needle = $rows[0]['customer_name'];

    $this->actingAs($user)
        ->get('/operations/consignees/export?search='.urlencode($needle))
        ->assertSuccessful()
        ->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
});
