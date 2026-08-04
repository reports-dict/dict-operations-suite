<?php

namespace App\Console\Commands;

use App\Services\Operations\RoadQueueEcdBoardService;
use App\Services\Operations\RoadQueueEcdCaptureService;
use App\Services\Operations\Support\PreviousShiftCalculator;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

#[Signature('operations:capture-road-queue-ecd {--only-tat} {--only-high-elapsed}')]
#[Description('Capture a Road Queue (ECD) TAT history + high-elapsed-transaction snapshot, independent of the public board being loaded in a browser.')]
class CaptureRoadQueueEcdHistory extends Command
{
    public function handle(
        RoadQueueEcdBoardService $boardService,
        RoadQueueEcdCaptureService $captureService,
        PreviousShiftCalculator $shiftCalculator,
    ): int {
        $onlyTat = (bool) $this->option('only-tat');
        $onlyHighElapsed = (bool) $this->option('only-high-elapsed');

        try {
            DB::reconnect('sparcsn4');

            $shift = $shiftCalculator->current();

            if (! $onlyTat) {
                $queue = $boardService->fetchQueue();
                $captureService->captureHighElapsedTransactions($queue);
                $this->line("  road-queue-ecd: captured {$queue->count()} high-elapsed candidate row(s) for shift {$shift['label']}");
            }

            if (! $onlyHighElapsed) {
                $tat = $boardService->fetchTat($shift['start'], $shift['end']);
                $captureService->captureTatHistory($shift, $tat);
                $this->line("  road-queue-ecd: captured TAT history for shift {$shift['label']}");
            }

            return self::SUCCESS;
        } catch (\Exception $e) {
            Log::error('Failed to capture Road Queue ECD history snapshot', ['error' => $e->getMessage()]);
            $this->error('Failed to capture Road Queue ECD history snapshot: '.$e->getMessage());

            return self::FAILURE;
        }
    }
}
