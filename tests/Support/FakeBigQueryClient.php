<?php

namespace Tests\Support;

use App\Services\Operations\DriverAssignment\Contracts\BigQueryClient;
use Throwable;

/**
 * Test double for BigQueryClient - never hits real BigQuery. Match a query
 * by a distinguishing substring (e.g. 'bio_timelog_logistic' for the
 * attendance query, 'EmployeeStatus' for the masterlist query) rather than
 * the full SQL text, since the service's SQL constants are the source of
 * truth and shouldn't need duplicating here.
 */
class FakeBigQueryClient implements BigQueryClient
{
    /** @var array<string, array<int, array<string, mixed>>> */
    private array $responses = [];

    /** @var array<string, Throwable> */
    private array $throwers = [];

    /** @var array<int, array{sql: string, parameters: array<string, mixed>}> */
    public array $calls = [];

    /**
     * @param  array<int, array<string, mixed>>  $rows
     */
    public function respondWith(string $sqlContains, array $rows): static
    {
        $this->responses[$sqlContains] = $rows;

        return $this;
    }

    public function throwFor(string $sqlContains, Throwable $exception): static
    {
        $this->throwers[$sqlContains] = $exception;

        return $this;
    }

    public function runQuery(string $sql, array $parameters = []): array
    {
        $this->calls[] = ['sql' => $sql, 'parameters' => $parameters];

        foreach ($this->throwers as $needle => $exception) {
            if (str_contains($sql, $needle)) {
                throw $exception;
            }
        }

        foreach ($this->responses as $needle => $rows) {
            if (str_contains($sql, $needle)) {
                return $rows;
            }
        }

        return [];
    }
}
