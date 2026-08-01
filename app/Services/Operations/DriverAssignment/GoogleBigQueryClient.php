<?php

namespace App\Services\Operations\DriverAssignment;

use App\Services\Operations\DriverAssignment\Contracts\BigQueryClient as BigQueryClientContract;
use Google\Cloud\BigQuery\BigQueryClient as GoogleCloudBigQueryClient;

class GoogleBigQueryClient implements BigQueryClientContract
{
    private ?GoogleCloudBigQueryClient $client = null;

    public function runQuery(string $sql, array $parameters = []): array
    {
        $queryJobConfig = $this->client()->query($sql);

        if ($parameters !== []) {
            $queryJobConfig = $queryJobConfig->parameters($parameters);
        }

        $rows = [];
        foreach ($this->client()->runQuery($queryJobConfig) as $row) {
            $rows[] = $row;
        }

        return $rows;
    }

    // Built lazily rather than in the constructor: this class is injected
    // into DriverAssignmentSyncService, which is constructor-injected into
    // DriverAssignmentController for every action (not just Fetch Now/sync)
    // - eager construction here threw "No project ID was provided" just
    // from loading the index page, before credentials are configured.
    private function client(): GoogleCloudBigQueryClient
    {
        return $this->client ??= new GoogleCloudBigQueryClient([
            'projectId' => config('bigquery.project_id'),
            'keyFilePath' => config('bigquery.credentials_path'),
        ]);
    }
}
