<?php

namespace App\Console\Commands;

use App\Services\Operations\ContainerYard\ContainerYardSyncService;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('app:sync-container-yard')]
#[Description('Sync yard container positions from sparcsn4 into the local yard_containers mirror for the Container Yard module.')]
class SyncContainerYard extends Command
{
    public function handle(ContainerYardSyncService $service): int
    {
        $log = $service->sync('scheduled');

        $this->line("  container-yard: {$log->status} ({$log->count} row(s))");

        return $log->status === 'success' ? self::SUCCESS : self::FAILURE;
    }
}
