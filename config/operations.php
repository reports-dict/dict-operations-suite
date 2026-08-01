<?php

use App\Models\RoadQueueEcdHighElapsedTransaction;
use App\Models\RoadQueueEcdTatHistory;
use App\Models\RoadQueueHighElapsedTransaction;
use App\Models\RoadQueueTatHistory;

return [

    /*
    |--------------------------------------------------------------------------
    | Operations history retention
    |--------------------------------------------------------------------------
    |
    | Number of months of snapshot history (TAT + high-elapsed transactions)
    | to retain for the Road Queue / Road Queue (ECD) modules before
    | `operations:purge-history` deletes it. Matches the 6-month default
    | both source apps (xps-road-queue, xps-road-queue-ecd) used.
    |
    */

    'history_retention_months' => env('OPERATIONS_HISTORY_RETENTION_MONTHS', 6),

    'history_models' => [
        RoadQueueTatHistory::class,
        RoadQueueHighElapsedTransaction::class,
        RoadQueueEcdTatHistory::class,
        RoadQueueEcdHighElapsedTransaction::class,
        // VesselSyncLog is deliberately NOT included here (nor is
        // VesselVisit) - both now live on the shared vessel_dashboard
        // connection (config/database.php), not this app's own database.
        // This command's scheduled daily DELETE must never run against
        // that live, shared connection.
    ],

];
