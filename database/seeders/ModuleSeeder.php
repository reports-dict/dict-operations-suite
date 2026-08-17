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
            // Its own module row (not a sub-permission below) since it has a
            // real Service class, page, and MODULE_NAV entry - just gated by
            // a separate permission from the base Driver Assignment view so
            // access to raw biometric logs can be granted independently.
            ['slug' => 'driver-assignment-logs', 'name' => 'Driver Assignment — Biometrics Logs'],
            ['slug' => 'vessel-dashboard', 'name' => 'Vessel Dashboard'],
            ['slug' => 'consignees', 'name' => 'Consignees'],
            ['slug' => 'container-yard', 'name' => 'Container Yard'],

            // Sub-permissions for actions more consequential than plain viewing -
            // not real modules (no Service class, no board, no MODULE_NAV entry),
            // just extra grantable rows reusing the module/permission machinery.
            // Granting the base module above no longer implies these.
            ['slug' => 'vessel-dashboard-manage', 'name' => 'Vessel Dashboard — Manage (Overrides & Sync)'],
            ['slug' => 'road-queue-export', 'name' => 'Road Queue — CSV Export'],
            ['slug' => 'road-queue-ecd-export', 'name' => 'Road Queue (ECD) — CSV Export'],
            ['slug' => 'container-yard-manage', 'name' => 'Container Yard — Manage (Blocks & Allocations)'],
        ];

        foreach ($modules as $data) {
            $module = Module::query()->firstOrCreate(['slug' => $data['slug']], $data);

            Permission::findOrCreate($module->permissionName());
        }
    }
}
