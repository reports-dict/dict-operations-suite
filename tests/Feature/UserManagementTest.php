<?php

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Sets attributes directly (not via mass assignment) since is_allowed isn't
 * fillable - mirrors GrantSuperadmin's pattern.
 */
function makeManagedUser(array $overrides = []): User
{
    $user = new User();
    $user->name = $overrides['name'] ?? 'UAM Test User';
    $user->username = $overrides['username'] ?? 'uam-test-'.Str::random(8);
    $user->email = $overrides['email'] ?? Str::random(8).'@example.test';
    $user->is_allowed = $overrides['is_allowed'] ?? true;
    $user->save();

    if (! empty($overrides['role'])) {
        $user->assignRole($overrides['role']);
    }

    return $user;
}

function insertSessionFor(User $user): void
{
    DB::table('sessions')->insert([
        'id' => Str::random(40),
        'user_id' => $user->id,
        'ip_address' => '127.0.0.1',
        'user_agent' => 'test',
        'payload' => base64_encode('test'),
        'last_activity' => time(),
    ]);
}

afterEach(function () {
    $ids = User::query()->where('username', 'like', 'uam-test-%')->pluck('id');
    DB::table('sessions')->whereIn('user_id', $ids)->delete();
    User::query()->whereIn('id', $ids)->delete();
});

it('redirects guests to login', function () {
    $this->get('/admin/users')->assertRedirect('/login');
});

it('blocks non-superadmins with a 403', function () {
    $admin = makeManagedUser(['role' => 'admin']);

    $this->actingAs($admin)->get('/admin/users')->assertForbidden();
});

it('lists users for a superadmin, filterable by username', function () {
    $superadmin = User::query()->where('username', 'kmorbita')->firstOrFail();
    makeManagedUser(['username' => 'uam-test-findme']);

    $this->actingAs($superadmin)
        ->get('/admin/users?username=uam-test-findme')
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('Admin/Users/Index')
            ->has('users.data', 1)
            ->where('users.data.0.username', 'uam-test-findme'));
});

it('lets a superadmin pre-authorize a new user by username', function () {
    $superadmin = User::query()->where('username', 'kmorbita')->firstOrFail();

    $this->actingAs($superadmin)
        ->post('/admin/users', ['username' => 'uam-test-new'])
        ->assertRedirect();

    $created = User::query()->where('username', 'uam-test-new')->firstOrFail();
    expect($created->is_allowed)->toBeTrue();
    expect($created->getRoleNames()->all())->toBe([]);
});

it('rejects adding a user with a username that already exists', function () {
    $superadmin = User::query()->where('username', 'kmorbita')->firstOrFail();
    $existing = makeManagedUser();

    $this->actingAs($superadmin)
        ->post('/admin/users', ['username' => $existing->username])
        ->assertSessionHasErrors('username');

    expect(User::query()->where('username', $existing->username)->count())->toBe(1);
});

it("lets a superadmin change another user's role", function () {
    $superadmin = User::query()->where('username', 'kmorbita')->firstOrFail();
    $target = makeManagedUser(['role' => 'bdd']);

    $this->actingAs($superadmin)
        ->patch("/admin/users/{$target->id}/role", ['role' => 'admin'])
        ->assertRedirect();

    expect($target->fresh()->getRoleNames()->all())->toBe(['admin']);
});

it('blocking a user saves is_allowed=false and force-logs them out', function () {
    $superadmin = User::query()->where('username', 'kmorbita')->firstOrFail();
    $target = makeManagedUser(['is_allowed' => true]);
    insertSessionFor($target);

    $this->actingAs($superadmin)
        ->patch("/admin/users/{$target->id}/access", ['is_allowed' => false])
        ->assertRedirect();

    expect($target->fresh()->is_allowed)->toBeFalse();
    expect(DB::table('sessions')->where('user_id', $target->id)->exists())->toBeFalse();
});

it('deleting a user removes them and force-logs them out', function () {
    $superadmin = User::query()->where('username', 'kmorbita')->firstOrFail();
    $target = makeManagedUser();
    insertSessionFor($target);
    $targetId = $target->id;

    $this->actingAs($superadmin)
        ->delete("/admin/users/{$targetId}")
        ->assertRedirect();

    expect(User::find($targetId))->toBeNull();
    expect(DB::table('sessions')->where('user_id', $targetId)->exists())->toBeFalse();
});

it('prevents a superadmin from modifying their own access, role, or account', function () {
    $superadmin = User::query()->where('username', 'kmorbita')->firstOrFail();

    $this->actingAs($superadmin)->patch("/admin/users/{$superadmin->id}/access", ['is_allowed' => false])->assertForbidden();
    $this->actingAs($superadmin)->patch("/admin/users/{$superadmin->id}/role", ['role' => 'bdd'])->assertForbidden();
    $this->actingAs($superadmin)->delete("/admin/users/{$superadmin->id}")->assertForbidden();
});

it("sets last_seen_at on a user's first authenticated request", function () {
    $user = makeManagedUser();
    expect($user->last_seen_at)->toBeNull();

    $this->actingAs($user)->get('/modules')->assertSuccessful();

    expect($user->fresh()->last_seen_at)->not->toBeNull();
    expect($user->fresh()->last_seen_at->diffInSeconds(now()))->toBeLessThan(5);
});

it('does not re-touch last_seen_at within the throttle window', function () {
    $user = makeManagedUser();
    $this->actingAs($user)->get('/modules')->assertSuccessful();
    $firstTouch = $user->fresh()->last_seen_at;

    $this->actingAs($user)->get('/modules')->assertSuccessful();

    expect($user->fresh()->last_seen_at->eq($firstTouch))->toBeTrue();
});

it('touches last_seen_at again after the throttle window elapses', function () {
    $user = makeManagedUser();
    $this->actingAs($user)->get('/modules')->assertSuccessful();
    $firstTouch = $user->fresh()->last_seen_at;

    $this->travel(2)->minutes();
    $this->actingAs($user)->get('/modules')->assertSuccessful();

    expect($user->fresh()->last_seen_at->gt($firstTouch))->toBeTrue();
});

it('includes last_seen_at in the users index Inertia prop', function () {
    $superadmin = User::query()->where('username', 'kmorbita')->firstOrFail();
    makeManagedUser(['username' => 'uam-test-activity']);

    $this->actingAs($superadmin)
        ->get('/admin/users?username=uam-test-activity')
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('Admin/Users/Index')
            ->has('users.data', 1)
            ->where('users.data.0.last_seen_at', null));
});
