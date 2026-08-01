<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Module;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class ModulePermissionController extends Controller
{
    /**
     * superadmin is excluded - it bypasses every check via the Gate::before
     * in AppServiceProvider, so granting/revoking its permissions is a no-op.
     */
    private const GRANTABLE_ROLES = ['admin', 'bdd'];

    public function index(): Response
    {
        $modules = Module::query()->orderBy('name')->get();
        $moduleNames = $modules->map->permissionName();

        $roles = Role::query()->whereIn('name', self::GRANTABLE_ROLES)->with('permissions')->get();

        $roleGrants = $roles->mapWithKeys(fn (Role $role) => [
            $role->name => $modules
                ->filter(fn (Module $module) => $role->permissions->contains('name', $module->permissionName()))
                ->pluck('id')
                ->values(),
        ]);

        $overrides = User::query()
            ->whereDoesntHave('roles', fn ($query) => $query->where('name', 'superadmin'))
            ->with(['permissions' => fn ($query) => $query->whereIn('name', $moduleNames)])
            ->get()
            ->flatMap(fn (User $user) => $user->permissions->map(function ($permission) use ($user, $modules) {
                $module = $modules->first(fn (Module $m) => $m->permissionName() === $permission->name);

                return [
                    'user_id' => $user->id,
                    'name' => $user->name,
                    'username' => $user->username,
                    'module_id' => $module->id,
                    'module_name' => $module->name,
                ];
            }))
            ->values();

        $users = User::query()
            ->whereDoesntHave('roles', fn ($query) => $query->where('name', 'superadmin'))
            ->orderBy('username')
            ->get(['id', 'name', 'username']);

        return Inertia::render('Admin/Permissions/Index', [
            'modules' => $modules->map->only(['id', 'slug', 'name']),
            'roles' => $roles->map->only(['id', 'name']),
            'roleGrants' => $roleGrants,
            'userOverrides' => $overrides,
            'users' => $users,
        ]);
    }

    public function updateRoleGrant(Request $request, Role $role): RedirectResponse
    {
        abort_if(! in_array($role->name, self::GRANTABLE_ROLES, true), 403, 'superadmin cannot be edited.');

        $validated = $request->validate([
            'module_id' => 'required|exists:modules,id',
            'granted' => 'required|boolean',
        ]);

        $module = Module::findOrFail($validated['module_id']);

        if ($validated['granted']) {
            $role->givePermissionTo($module->permissionName());
        } else {
            $role->revokePermissionTo($module->permissionName());
        }

        return back();
    }

    public function grantUserOverride(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'module_id' => 'required|exists:modules,id',
        ]);

        $user = User::findOrFail($validated['user_id']);

        if ($user->hasRole('superadmin')) {
            throw ValidationException::withMessages([
                'user_id' => 'Superadmin already has access to every module.',
            ]);
        }

        $module = Module::findOrFail($validated['module_id']);

        $user->givePermissionTo($module->permissionName());

        return back();
    }

    public function revokeUserOverride(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'module_id' => 'required|exists:modules,id',
        ]);

        $module = Module::findOrFail($validated['module_id']);

        $user->revokePermissionTo($module->permissionName());

        return back();
    }
}
