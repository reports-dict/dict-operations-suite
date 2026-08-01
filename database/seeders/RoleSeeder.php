<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    /**
     * Seed the app's three fixed roles. superadmin is granted every
     * permission implicitly via a Gate::before check in AppServiceProvider,
     * so it doesn't need permissions assigned here.
     */
    public function run(): void
    {
        foreach (['superadmin', 'admin', 'bdd'] as $role) {
            Role::findOrCreate($role);
        }
    }
}
