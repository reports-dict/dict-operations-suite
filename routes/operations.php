<?php

use App\Http\Controllers\Operations\DriverAssignmentController;
use App\Http\Controllers\Operations\ReeferPluginPerCategoryController;
use App\Http\Controllers\Operations\ReeferPluginReportController;
use App\Http\Controllers\Operations\RoadQueueEcdHistoryController;
use App\Http\Controllers\Operations\RoadQueueHistoryController;
use App\Http\Controllers\Operations\VesselDashboardManagementController;
use Illuminate\Support\Facades\Route;

Route::prefix('operations')->middleware(['web', 'auth', 'allowed'])->group(function (): void {
    Route::prefix('reefer-plugin-report')->middleware('can:operations.reefer-plugin-report.view')->group(function (): void {
        Route::get('per-container', [ReeferPluginReportController::class, 'index'])
            ->name('operations.reefer-plugin-report.per-container');
        Route::get('per-container/export', [ReeferPluginReportController::class, 'export'])
            ->name('operations.reefer-plugin-report.per-container.export');

        Route::get('per-category', [ReeferPluginPerCategoryController::class, 'index'])
            ->name('operations.reefer-plugin-report.per-category');
        Route::get('per-category/export', [ReeferPluginPerCategoryController::class, 'export'])
            ->name('operations.reefer-plugin-report.per-category.export');
    });

    // The live boards for these two modules are intentionally public - see
    // routes/kiosk.php. Only the historical dashboard below is permission-gated.
    Route::prefix('road-queue')->middleware('can:operations.road-queue.view')->group(function (): void {
        Route::get('history', [RoadQueueHistoryController::class, 'index'])
            ->name('operations.road-queue.history');
    });

    // CSV export is a separate permission from viewing the history dashboard
    // above - granting one no longer implies the other.
    Route::prefix('road-queue')->middleware('can:operations.road-queue-export.view')->group(function (): void {
        Route::get('history/export/tat', [RoadQueueHistoryController::class, 'exportTat'])
            ->name('operations.road-queue.history.export-tat');
        Route::get('history/export/transactions', [RoadQueueHistoryController::class, 'exportTransactions'])
            ->name('operations.road-queue.history.export-transactions');
    });

    Route::prefix('road-queue-ecd')->middleware('can:operations.road-queue-ecd.view')->group(function (): void {
        Route::get('history', [RoadQueueEcdHistoryController::class, 'index'])
            ->name('operations.road-queue-ecd.history');
    });

    Route::prefix('road-queue-ecd')->middleware('can:operations.road-queue-ecd-export.view')->group(function (): void {
        Route::get('history/export/tat', [RoadQueueEcdHistoryController::class, 'exportTat'])
            ->name('operations.road-queue-ecd.history.export-tat');
        Route::get('history/export/transactions', [RoadQueueEcdHistoryController::class, 'exportTransactions'])
            ->name('operations.road-queue-ecd.history.export-transactions');
    });

    // Employee/biometric data - no public kiosk route, unlike Road Queue.
    Route::prefix('driver-assignment')->middleware('can:operations.driver-assignment.view')->group(function (): void {
        Route::get('/', [DriverAssignmentController::class, 'index'])
            ->name('operations.driver-assignment.index');
        Route::post('trucks', [DriverAssignmentController::class, 'storeTruck'])
            ->name('operations.driver-assignment.trucks.store');
        Route::put('trucks/{truck}', [DriverAssignmentController::class, 'updateTruck'])
            ->name('operations.driver-assignment.trucks.update');
        Route::delete('trucks/{truck}', [DriverAssignmentController::class, 'destroyTruck'])
            ->name('operations.driver-assignment.trucks.destroy');
        Route::post('trucks/{truck}/assign', [DriverAssignmentController::class, 'assign'])
            ->name('operations.driver-assignment.assign');
        Route::delete('trucks/{truck}/assign', [DriverAssignmentController::class, 'unassign'])
            ->name('operations.driver-assignment.unassign');
        Route::post('sync-now', [DriverAssignmentController::class, 'fetchNow'])
            ->name('operations.driver-assignment.sync-now');
    });

    // The live board for this module is intentionally public - see
    // routes/kiosk.php. Only the management dashboard below is permission-gated.
    Route::prefix('vessel-dashboard')->middleware('can:operations.vessel-dashboard.view')->group(function (): void {
        Route::get('management', [VesselDashboardManagementController::class, 'index'])
            ->name('operations.vessel-dashboard.management');
    });

    // Overrides + manual sync are mutating/side-effecting actions - gated by a
    // separate permission from plain viewing above, so granting one no longer
    // implies the other.
    Route::prefix('vessel-dashboard')->middleware('can:operations.vessel-dashboard-manage.view')->group(function (): void {
        Route::post('overrides', [VesselDashboardManagementController::class, 'storeOverride'])
            ->name('operations.vessel-dashboard.overrides.store');
        Route::delete('overrides/{obIbId}', [VesselDashboardManagementController::class, 'destroyOverride'])
            ->name('operations.vessel-dashboard.overrides.destroy');
        Route::post('sync-now', [VesselDashboardManagementController::class, 'syncNow'])
            ->name('operations.vessel-dashboard.sync-now');
    });
});
