<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Services\Operations\RoadQueueBoardService;
use App\Services\Operations\RoadQueueCaptureService;
use App\Services\Operations\Support\PreviousShiftCalculator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class RoadQueueBoardController extends Controller
{
    /**
     * Public, unauthenticated kiosk board (see routes/kiosk.php) - must
     * never surface a raw exception to an unattended TV display, so errors
     * degrade to an inline "error" prop instead of bubbling up.
     */
    public function __invoke(
        RoadQueueBoardService $boardService,
        RoadQueueCaptureService $captureService,
        PreviousShiftCalculator $shiftCalculator,
    ): Response {
        try {
            DB::reconnect('sparcsn4');

            $shift = $shiftCalculator->current();

            $queue = $boardService->fetchQueue();
            $tatPrecheckToOutgate = $boardService->fetchPrecheckToOutgateTat($shift['start'], $shift['end']);
            $tatIngateToOutgate = $boardService->fetchIngateToOutgateTat($shift['start'], $shift['end']);
            $containersProcessed = $boardService->fetchContainersProcessedCount($shift['start'], $shift['end']);

            // Live running count for whichever shift is currently in
            // progress - separate from $shift above (the previous
            // *completed* shift the TAT figures are scoped to).
            // currentInProgress() returns Carbon objects, not the
            // pre-formatted strings current() returns, so format them the
            // same way before binding as SQL params.
            $inProgress = $shiftCalculator->currentInProgress();
            $containersProcessedCurrentShift = $boardService->fetchContainersProcessedCount(
                $inProgress['start']->format('Y-m-d H:i:s').'.000',
                $inProgress['end']->format('Y-m-d H:i:s').'.000',
            );

            $captureService->captureTatHistory($shift, 'precheck_to_outgate', $tatPrecheckToOutgate, $containersProcessed);
            $captureService->captureTatHistory($shift, 'ingate_to_outgate', $tatIngateToOutgate, $containersProcessed);
            $captureService->captureHighElapsedTransactions($queue);

            return Inertia::render('Operations/RoadQueue/Board', [
                'roadQueues' => $queue,
                'tatPrecheckToOutgate' => $tatPrecheckToOutgate,
                'tatIngateToOutgate' => $tatIngateToOutgate,
                'containersProcessed' => $containersProcessed,
                'containersProcessedCurrentShift' => $containersProcessedCurrentShift,
                'currentShiftLabel' => $inProgress['label'],
                'shiftLabel' => $shift['label'],
                'shiftRange' => $shift['range'],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch Road Queue board data', ['error' => $e->getMessage()]);

            return Inertia::render('Operations/RoadQueue/Board', [
                'roadQueues' => [],
                'error' => 'Unable to fetch road queue data. Please try again later.',
                'debug_error' => config('app.debug') ? $e->getMessage() : null,
            ]);
        }
    }
}
