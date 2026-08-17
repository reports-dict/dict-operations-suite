<?php

use App\Http\Controllers\Operations\ContainerYardBoardController;
use App\Http\Controllers\Operations\ContainerYardDataController;
use App\Http\Controllers\Operations\RoadQueueBoardController;
use App\Http\Controllers\Operations\RoadQueueEcdBoardController;
use App\Http\Controllers\Operations\VesselDashboardBoardController;
use App\Http\Controllers\Operations\VesselDashboardDataController;
use Illuminate\Support\Facades\Route;

// Deliberately public/unauthenticated routes - do NOT add `auth`/`allowed`/
// `can:` middleware here. These two boards are meant for unattended
// wall-mounted TV displays (an explicit requirement carried over from the
// source xps-road-queue / xps-road-queue-ecd apps), unlike every other
// module in this app. The historical dashboards for these same modules
// (routes/operations.php) stay permission-gated as normal - only the live
// board itself is public.
Route::prefix('operations')->middleware(['web'])->group(function (): void {
    Route::get('road-queue/board', RoadQueueBoardController::class)
        ->name('operations.road-queue.board');

    Route::get('road-queue-ecd/board', RoadQueueEcdBoardController::class)
        ->name('operations.road-queue-ecd.board');

    // Same public posture, carried over from vessel-dashboard-app - the
    // board client-polls the data endpoint every 60s (see
    // Pages/Operations/VesselDashboard/Board.tsx), so both must stay public.
    Route::get('vessel-dashboard/board', VesselDashboardBoardController::class)
        ->name('operations.vessel-dashboard.board');

    Route::get('vessel-dashboard/data', VesselDashboardDataController::class)
        ->name('operations.vessel-dashboard.data');

    // Same public posture, carried over from local-simplified-xps-v2 - the
    // source app already let anonymous "viewers" browse the yard search/
    // visualization without login. The board client-fetches the data/*
    // endpoints below (see Pages/Operations/ContainerYard/Board.tsx). Block/
    // Allocation management stays gated (routes/operations.php).
    Route::get('container-yard/board', ContainerYardBoardController::class)
        ->name('operations.container-yard.board');

    Route::get('container-yard/data/blocks', [ContainerYardDataController::class, 'blocks'])
        ->name('operations.container-yard.data.blocks');

    Route::get('container-yard/data/containers', [ContainerYardDataController::class, 'containers'])
        ->name('operations.container-yard.data.containers');

    Route::get('container-yard/data/search', [ContainerYardDataController::class, 'liveSearch'])
        ->name('operations.container-yard.data.search');
});
