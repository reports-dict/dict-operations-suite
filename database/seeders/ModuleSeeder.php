<?php

namespace Database\Seeders;

use App\Models\Module;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class ModuleSeeder extends Seeder
{
    /**
     * Registry of Operations Suite modules. Each module gets a matching
     * Spatie permission so superadmin can grant a specific user or role
     * access to it independent of their base role (per APP REQUIREMENT.md).
     */
    public function run(): void
    {
        $modules = [
            ['slug' => 'reefer-plugin-report', 'name' => 'Reefer Plug-in Hours Report'],
            ['slug' => 'road-queue', 'name' => 'Road Queue'],
            ['slug' => 'road-queue-ecd', 'name' => 'Road Queue (ECD)'],
            ['slug' => 'driver-assignment', 'name' => 'Driver Assignment'],
            ['slug' => 'vessel-dashboard', 'name' => 'Vessel Dashboard'],
        ];

        foreach ($modules as $data) {
            $module = Module::query()->firstOrCreate(['slug' => $data['slug']], $data);

            Permission::findOrCreate($module->permissionName());
        }
    }
}
