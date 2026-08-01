<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class UserManagementController extends Controller
{
    private const ROLES = ['superadmin', 'admin', 'bdd'];

    public function index(Request $request): Response
    {
        $filters = [
            'username' => $request->string('username')->toString() ?: null,
            'status' => $request->string('status')->toString() ?: 'all',
            'role' => $request->string('role')->toString() ?: 'all',
        ];

        $users = User::query()
            ->with('roles')
            ->when($filters['username'], fn ($query) => $query->where('username', 'like', "%{$filters['username']}%"))
            ->when($filters['status'] === 'allowed', fn ($query) => $query->where('is_allowed', true))
            ->when($filters['status'] === 'blocked', fn ($query) => $query->where('is_allowed', false))
            ->when($filters['role'] !== 'all', fn ($query) => $query->whereHas('roles', fn ($q) => $q->where('name', $filters['role'])))
            ->orderBy('username')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'is_allowed' => $user->is_allowed,
                'role' => $user->roles->first()?->name,
            ]);

        return Inertia::render('Admin/Users/Index', [
            'users' => $users,
            'filters' => $filters,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'username' => 'required|string|unique:users,username',
        ]);

        $user = new User();
        $user->name = $validated['username'];
        $user->username = $validated['username'];
        $user->email = "{$validated['username']}@placeholder.local";
        $user->is_allowed = true;
        $user->save();

        return back();
    }

    public function updateAccess(Request $request, User $user): RedirectResponse
    {
        abort_if($user->is(Auth::user()), 403, "You can't change your own access.");

        $user->is_allowed = $request->boolean('is_allowed');
        $user->save();

        if (! $user->is_allowed) {
            $user->forceLogout();
        }

        return back();
    }

    public function updateRole(Request $request, User $user): RedirectResponse
    {
        abort_if($user->is(Auth::user()), 403, "You can't change your own role.");

        $validated = $request->validate([
            'role' => 'required|in:'.implode(',', self::ROLES),
        ]);

        $user->syncRoles([$validated['role']]);

        return back();
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        abort_if($user->is(Auth::user()), 403, "You can't delete your own account.");

        $user->forceLogout();
        $user->delete();

        return back();
    }
}
