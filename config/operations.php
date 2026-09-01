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

    /*
    |--------------------------------------------------------------------------
    | Vessel Schedule connection
    |--------------------------------------------------------------------------
    |
    | Which database connection App\Models\VesselSchedule reads/writes.
    | Defaults to the shared production vessel_dashboard connection (see
    | config/database.php) - VesselSchedule is a brand-new table with no
    | pre-existing production schema (unlike VesselVisit/VesselPlanOverride),
    | so unlike those, migrating it there is intentional here. Override to
    | 'mysql' in a local .env during development/testing so schedule data
    | and migrations land in this app's own database instead of the real
    | external one - useful since a developer's local .env may already
    | point VESSEL_DB_HOST at the real production box.
    |
    */

    'vessel_schedule_connection' => env('VESSEL_SCHEDULE_CONNECTION', 'vessel_dashboard'),

];
