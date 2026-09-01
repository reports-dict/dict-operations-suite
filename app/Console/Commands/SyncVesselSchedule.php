<?php

namespace App\Console\Commands;

use App\Services\Operations\VesselDashboard\VesselScheduleSyncService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('operations:sync-vessel-schedule')]
#[Description('Sync vessel_schedules from sparcsn4, independent of anyone viewing the Vessel Dashboard board/Management page.')]
class SyncVesselSchedule extends Command
{
    public function handle(VesselScheduleSyncService $service): int
    {
        $service->sync();
        $this->line('Vessel Schedule sync complete.');

        return self::SUCCESS;
    }
}
