<?php

namespace App\Services\Operations\DriverAssignment\Contracts;

interface BigQueryClient
{
    /**
     * Run a BigQuery SQL query and return every row as an associative array.
     *
     * Parameter values that implement \DateTimeInterface (e.g. Carbon) are
     * bound as BigQuery DATETIME parameters automatically by the SDK's value
     * mapper - pass Carbon instances for date/time bind values rather than
     * pre-formatted strings, so BigQuery gets an explicit DATETIME type
     * instead of an ambiguous STRING one.
     *
     * @param  array<string, mixed>  $parameters
     * @return array<int, array<string, mixed>>
     */
    public function runQuery(string $sql, array $parameters = []): array;
}
