<?php

// BigQuery isn't a PDO/Illuminate\Database driver - there's no native
// Laravel connection for it, so this lives as its own small config file
// rather than a config/database.php connection entry. See
// App\Services\Operations\DriverAssignment\GoogleBigQueryClient, which
// reads these two values to build the Google\Cloud\BigQuery\BigQueryClient.
return [
    'project_id' => env('BIGQUERY_PROJECT_ID'),

    // Service account JSON key file - never commit this. Place the real
    // file at storage/app/private/bigquery-service-account.json (already
    // bind-mounted into the container, no extra Docker config needed).
    'credentials_path' => env('BIGQUERY_CREDENTIALS_PATH') ?: storage_path('app/private/bigquery-service-account.json'),
];
