<?php

use App\Models\User;
use Illuminate\Support\Str;

afterEach(function () {
    User::query()->where('username', 'like', 'cy-test-%')->delete();
});

it('is reachable without authentication', function () {
    $this->get('/operations/container-yard/board')
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page->component('Operations/ContainerYard/Board'));
});

it('serves the public blocks data endpoint', function () {
    $this->get('/operations/container-yard/data/blocks')
        ->assertSuccessful()
        ->assertJsonStructure(['success', 'data', 'pagination']);
});

it('serves the public containers data endpoint', function () {
    $this->get('/operations/container-yard/data/containers')
        ->assertSuccessful()
        ->assertJsonStructure(['success', 'data', 'pagination']);
});

it('rejects a live search query shorter than 5 characters', function () {
    $this->get('/operations/container-yard/data/search?q=ABC')
        ->assertStatus(422)
        ->assertJson(['success' => false]);
});

it('redirects guests away from management', function () {
    $this->get('/operations/container-yard/management')->assertRedirect('/login');
});

it('renders the management dashboard for an allowed superadmin', function () {
    $user = User::query()->where('username', 'kmorbita')->firstOrFail();

    $this->actingAs($user)
        ->get('/operations/container-yard/management')
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('Operations/ContainerYard/Management')
            ->has('stats')
            ->has('logs.data')
            ->has('blocks.data')
            ->has('allocations.data'));
});

it('blocks a user without the module permission with a 403', function () {
    $user = new User;
    $user->name = 'Container Yard Test User';
    $user->username = 'cy-test-'.Str::random(8);
    $user->email = Str::random(8).'@example.test';
    $user->is_allowed = true;
    $user->save();
    $user->assignRole('bdd');

    $this->actingAs($user)->get('/operations/container-yard/management')->assertForbidden();
});

it('lets a user without the module permission still reach the public board', function () {
    $user = new User;
    $user->name = 'Container Yard Test User';
    $user->username = 'cy-test-'.Str::random(8);
    $user->email = Str::random(8).'@example.test';
    $user->is_allowed = true;
    $user->save();
    $user->assignRole('bdd');

    $this->actingAs($user)->get('/operations/container-yard/board')->assertSuccessful();
});

it('blocks block/allocation mutations for a user with only the base view permission', function () {
    $user = new User;
    $user->name = 'Container Yard Test User';
    $user->username = 'cy-test-'.Str::random(8);
    $user->email = Str::random(8).'@example.test';
    $user->is_allowed = true;
    $user->save();
    $user->assignRole('bdd');
    $user->givePermissionTo('operations.container-yard.view');

    $this->actingAs($user)
        ->post('/operations/container-yard/blocks', [
            'name' => 'B99',
            'bay_start' => 1,
            'bay_end' => 10,
            'row_start' => 'A',
            'row_end' => 'F',
            'max_tier' => 5,
            'facility' => 'Terminal',
        ])
        ->assertForbidden();
});
