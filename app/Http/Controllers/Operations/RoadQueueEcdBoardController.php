<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Services\Operations\RoadQueueEcdBoardService;
use App\Services\Operations\RoadQueueEcdCaptureService;
use App\Services\Operations\Support\PreviousShiftCalculator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class RoadQueueEcdBoardController extends Controller
{
    /**
     * Public, unauthenticated kiosk board (see routes/kiosk.php) - must
     * never surface a raw exception to an unattended TV display, so errors
     * degrade to an inline "error" prop instead of bubbling up.
     */
    public function __invoke(
        RoadQueueEcdBoardService $boardService,
        RoadQueueEcdCaptureService $captureService,
        PreviousShiftCalculator $shiftCalculator,
    ): Response {
        try {
            DB::reconnect('sparcsn4');

            $shift = $shiftCalculator->current();

            $queue = $boardService->fetchQueue();
            $tat = $boardService->fetchTat($shift['start'], $shift['end']);
            $containersProcessed = $boardService->fetchContainersProcessedCount($shift['start'], $shift['end']);

            // Live running count for whichever shift is currently in
            // progress - separate from $shift above (the previous
            // *completed* shift the TAT figure is scoped to).
            // currentInProgress() returns Carbon objects, not the
            // pre-formatted strings current() returns, so format them the
            // same way before binding as SQL params.
            $inProgress = $shiftCalculator->currentInProgress();
            $containersProcessedCurrentShift = $boardService->fetchContainersProcessedCount(
                $inProgress['start']->format('Y-m-d H:i:s').'.000',
                $inProgress['end']->format('Y-m-d H:i:s').'.000',
            );

            $captureService->captureTatHistory($shift, $tat, $containersProcessed);
            $captureService->captureHighElapsedTransactions($queue);

            return Inertia::render('Operations/RoadQueueEcd/Board', [
                'roadQueues' => $queue,
                'tat' => $tat,
                'containersProcessed' => $containersProcessed,
                'containersProcessedCurrentShift' => $containersProcessedCurrentShift,
                'currentShiftLabel' => $inProgress['label'],
                'shiftLabel' => $shift['label'],
                'shiftRange' => $shift['range'],
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to fetch Road Queue ECD board data', ['error' => $e->getMessage()]);

            return Inertia::render('Operations/RoadQueueEcd/Board', [
                'roadQueues' => [],
                'error' => 'Unable to fetch road queue data. Please try again later.',
                'debug_error' => config('app.debug') ? $e->getMessage() : null,
            ]);
        }
    }
}
