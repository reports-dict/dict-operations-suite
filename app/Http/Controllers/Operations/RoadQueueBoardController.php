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

            $captureService->captureTatHistory($shift, 'precheck_to_outgate', $tatPrecheckToOutgate);
            $captureService->captureTatHistory($shift, 'ingate_to_outgate', $tatIngateToOutgate);
            $captureService->captureHighElapsedTransactions($queue);

            return Inertia::render('Operations/RoadQueue/Board', [
                'roadQueues' => $queue,
                'tatPrecheckToOutgate' => $tatPrecheckToOutgate,
                'tatIngateToOutgate' => $tatIngateToOutgate,
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
