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

            $captureService->captureTatHistory($shift, $tat);
            $captureService->captureHighElapsedTransactions($queue);

            return Inertia::render('Operations/RoadQueueEcd/Board', [
                'roadQueues' => $queue,
                'tat' => $tat,
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
