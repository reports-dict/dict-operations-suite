<?php

namespace App\Console\Commands;

use App\Services\Operations\VesselDashboard\VesselVisitSyncService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('operations:sync-vessel-dashboard')]
#[Description('Sync active vessel visits from sparcsn4 into the local vessel_visits mirror for the Vessel Dashboard module.')]
class SyncVesselDashboardData extends Command
{
    public function handle(VesselVisitSyncService $service): int
    {
        $log = $service->sync('schedule');

        $this->line("  vessel-dashboard: {$log->status} ({$log->rows_upserted} row(s))");

        return $log->status === 'success' ? self::SUCCESS : self::FAILURE;
    }
}
