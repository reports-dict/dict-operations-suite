<?php

namespace App\Console\Commands;

use App\Services\Operations\RoadQueueBoardService;
use App\Services\Operations\RoadQueueCaptureService;
use App\Services\Operations\Support\PreviousShiftCalculator;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

#[Signature('operations:capture-road-queue {--only-tat} {--only-high-elapsed}')]
#[Description('Capture a Road Queue TAT history + high-elapsed-transaction snapshot, independent of the public board being loaded in a browser.')]
class CaptureRoadQueueHistory extends Command
{
    public function handle(
        RoadQueueBoardService $boardService,
        RoadQueueCaptureService $captureService,
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
                $this->line("  road-queue: captured {$queue->count()} high-elapsed candidate row(s) for shift {$shift['label']}");
            }

            if (! $onlyHighElapsed) {
                $tatPrecheckToOutgate = $boardService->fetchPrecheckToOutgateTat($shift['start'], $shift['end']);
                $tatIngateToOutgate = $boardService->fetchIngateToOutgateTat($shift['start'], $shift['end']);

                $captureService->captureTatHistory($shift, 'precheck_to_outgate', $tatPrecheckToOutgate);
                $captureService->captureTatHistory($shift, 'ingate_to_outgate', $tatIngateToOutgate);
                $this->line("  road-queue: captured TAT history for shift {$shift['label']}");
            }

            return self::SUCCESS;
        } catch (\Exception $e) {
            Log::error('Failed to capture Road Queue history snapshot', ['error' => $e->getMessage()]);
            $this->error('Failed to capture Road Queue history snapshot: '.$e->getMessage());

            return self::FAILURE;
        }
    }
}
