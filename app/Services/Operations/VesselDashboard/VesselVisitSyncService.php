<?php

namespace App\Services\Operations\VesselDashboard;

use App\Models\VesselSyncLog;
use App\Models\VesselVisit;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Hourly sync of active vessel visits from sparcsn4 into the local
 * vessel_visits mirror. Ported from vessel-dashboard-app's
 * SyncVesselVisitsJob, but as a plain service invoked synchronously by
 * SyncVesselDashboardData rather than a ShouldQueue job - this suite has no
 * queue worker running, only `schedule:run` (see routes/console.php).
 */
class VesselVisitSyncService
{
    public function __construct(
        private readonly VesselDashboardBoardService $boardService,
    ) {}

    public function sync(string $triggeredBy = 'schedule'): VesselSyncLog
    {
        $startMs = (int) round(microtime(true) * 1000);

        try {
            $rows = $this->boardService->fetchActiveVessels();

            $rowsFetched = count($rows);
            $rowsUpserted = 0;

            foreach ($rows as $row) {
                VesselVisit::updateOrCreate(
                    ['ob_ib_id' => $row->ob_ib_id],
                    [
                        'vessel_name' => $row->vessel_name,
                        'service' => $row->service,
                        'vessel_id' => $row->vessel_id,
                        'phase' => $row->phase,
                        'line_op' => $row->line_op,
                        'total_planned_loading_wi' => (int) $row->total_planned_loading_wi,
                        'load_plan_fcl_20ft' => (int) $row->load_plan_fcl_20ft,
                        'load_plan_fcl_40ft' => (int) $row->load_plan_fcl_40ft,
                        'load_plan_empty_20ft' => (int) $row->load_plan_empty_20ft,
                        'load_plan_empty_40ft' => (int) $row->load_plan_empty_40ft,
                        'total_loaded_count' => (int) $row->total_loaded_count,
                        'loaded_fcl_20ft' => (int) $row->loaded_fcl_20ft,
                        'loaded_fcl_40ft' => (int) $row->loaded_fcl_40ft,
                        'loaded_empty_20ft' => (int) $row->loaded_empty_20ft,
                        'loaded_empty_40ft' => (int) $row->loaded_empty_40ft,
                        'total_planned_discharge' => (int) $row->total_planned_discharge,
                        'discharge_plan_fcl_20ft' => (int) $row->discharge_plan_fcl_20ft,
                        'discharge_plan_fcl_40ft' => (int) $row->discharge_plan_fcl_40ft,
                        'discharge_plan_mty_20ft' => (int) $row->discharge_plan_mty_20ft,
                        'discharge_plan_mty_40ft' => (int) $row->discharge_plan_mty_40ft,
                        'total_discharged_count' => (int) $row->total_discharged_count,
                        'discharged_fcl_20ft' => (int) $row->discharged_fcl_20ft,
                        'discharged_fcl_40ft' => (int) $row->discharged_fcl_40ft,
                        'discharged_empty_20ft' => (int) $row->discharged_empty_20ft,
                        'discharged_empty_40ft' => (int) $row->discharged_empty_40ft,
                        'synced_at' => now(),
                    ]
                );
                $rowsUpserted++;
            }

            return VesselSyncLog::create([
                'ran_at' => now(),
                'rows_fetched' => $rowsFetched,
                'rows_upserted' => $rowsUpserted,
                'status' => 'success',
                'error_message' => null,
                'duration_ms' => (int) round(microtime(true) * 1000) - $startMs,
            ]);
        } catch (Throwable $e) {
            Log::error('Vessel Dashboard: sync failed', ['triggered_by' => $triggeredBy, 'error' => $e->getMessage()]);

            return VesselSyncLog::create([
                'ran_at' => now(),
                'rows_fetched' => 0,
                'rows_upserted' => 0,
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'duration_ms' => (int) round(microtime(true) * 1000) - $startMs,
            ]);
        }
    }
}
