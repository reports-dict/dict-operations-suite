<?php

use App\Http\Controllers\Admin\ModulePermissionController;
use App\Http\Controllers\Admin\UserManagementController;
use Illuminate\Support\Facades\Route;

Route::prefix('admin')->middleware(['web', 'auth', 'allowed', 'superadmin'])->group(function (): void {
    Route::get('users', [UserManagementController::class, 'index'])->name('admin.users.index');
    Route::post('users', [UserManagementController::class, 'store'])->name('admin.users.store');
    Route::patch('users/{user}/access', [UserManagementController::class, 'updateAccess'])->name('admin.users.access');
    Route::patch('users/{user}/role', [UserManagementController::class, 'updateRole'])->name('admin.users.role');
    Route::delete('users/{user}', [UserManagementController::class, 'destroy'])->name('admin.users.destroy');

    Route::get('permissions', [ModulePermissionController::class, 'index'])->name('admin.permissions.index');
    Route::patch('permissions/roles/{role}', [ModulePermissionController::class, 'updateRoleGrant'])->name('admin.permissions.roles.update');
    Route::patch('permissions/users/{user}/overrides', [ModulePermissionController::class, 'syncUserOverrides'])->name('admin.permissions.users.sync');
    Route::delete('permissions/users/{user}', [ModulePermissionController::class, 'revokeUserOverride'])->name('admin.permissions.users.revoke');
});
