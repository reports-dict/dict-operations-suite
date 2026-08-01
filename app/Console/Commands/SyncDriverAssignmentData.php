<?php

namespace App\Console\Commands;

use App\Services\Operations\DriverAssignment\DriverAssignmentSyncService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('operations:sync-driver-assignment')]
#[Description('Sync the Prime Mover Driver masterlist and on-duty status from BigQuery for the Driver Assignment module.')]
class SyncDriverAssignmentData extends Command
{
    public function handle(DriverAssignmentSyncService $service): int
    {
        $results = $service->syncAll('schedule');

        foreach ($results as $type => $log) {
            $this->line("  {$type}: {$log->status} ({$log->rows_synced} row(s))");
        }

        return self::SUCCESS;
    }
}
