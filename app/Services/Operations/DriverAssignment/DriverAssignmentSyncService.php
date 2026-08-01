<?php

namespace App\Services\Operations\DriverAssignment;

use App\Models\BigQuerySyncLog;
use App\Models\Driver;
use App\Services\Operations\DriverAssignment\Contracts\BigQueryClient;
use App\Services\Operations\Support\PreviousShiftCalculator;
use DateTimeInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class DriverAssignmentSyncService
{
    // Prime Mover Driver masterlist. EmployeeID is selected explicitly (the
    // source query didn't include it) so it can serve as the stable link
    // key between masterlist, attendance logs, and truck assignments -
    // matching by name text alone is fragile since the attendance query
    // formats names differently ("Last, First" vs "First Middle Last" here).
    private const MASTERLIST_SQL = <<<'SQL'
        SELECT
          CAST(EmployeeID AS STRING) AS EmployeeID,
          CONCAT(FirstName, IF(MiddleName IS NOT NULL, CONCAT(' ', MiddleName), ''), ' ', LastName) AS FullName,
          Designation
        FROM `anflo-dict-prd.biometric.bio_masterdata`
        WHERE Designation LIKE '%Prime Mover Driver%'
          AND EmployeeStatus = 'Active'
        SQL;

    // Adds EmployeeID to SELECT/GROUP BY (also incidentally fixes two
    // same-named employees collapsing into one row) and narrows Designation
    // to Prime Mover Driver only - the source query also matched a second,
    // out-of-scope designation. MIN(...) per (EmployeeID, LogType) within
    // whatever @start_time/@end_time window is bound gives the earliest
    // scan per log type in that window - scoped to the in-progress shift,
    // "has IN, no OUT" in the result set means currently on-duty.
    private const ATTENDANCE_SQL = <<<'SQL'
        SELECT
          m.EmployeeID AS EmployeeID,
          CONCAT(m.LastName, ', ', m.FirstName) AS FullName,
          CASE WHEN t.TK_AtL_MachNo IN (44, 78, 85) THEN 'TERMINAL' ELSE 'ECD' END AS Location,
          m.DepartmentName AS Department,
          m.SectionName AS Section,
          m.Designation,
          IFNULL(
            FORMAT_DATETIME('%Y-%m-%d %H:%M:%S', MIN(CASE WHEN dm.MachineNo IS NOT NULL THEN t.TK_Atl_LogDateTime END)),
            ''
          ) AS BiometricTime,
          CASE WHEN t.TK_AtL_LogType = 0 THEN 'IN' WHEN t.TK_AtL_LogType = 1 THEN 'OUT' END AS LogType
        FROM `anflo-dict-prd.biometric.bio_timelog_logistic` t
        LEFT JOIN `anflo-dict-prd.biometric.bio_masterdata` m ON t.TK_AtL_EmpID = CAST(m.EmployeeID AS STRING)
        LEFT JOIN `anflo-dict-prd.dbo.dim_machine` dm ON t.TK_AtL_MachNo = dm.MachineNo
        WHERE
          t.TK_Atl_LogDateTime >= @start_time
          AND t.TK_Atl_LogDateTime < @end_time
          AND m.CompanyShortName = 'DICT'
          AND m.EmployeeID IS NOT NULL
          AND (dm.MachineNo IS NULL OR dm.MachineNo != 89)
          AND t.TK_AtL_MachNo IN (44, 78, 85, 87)
          AND m.LastName IS NOT NULL
          AND m.FirstName IS NOT NULL
          AND UPPER(m.LastName) != 'NULL'
          AND UPPER(m.FirstName) != 'NULL'
          AND m.Designation = 'Prime Mover Driver'
        GROUP BY
          m.EmployeeID, Location, t.TK_AtL_LogType, m.DepartmentName, m.SectionName, m.Designation, FullName
        ORDER BY
          Location, m.DepartmentName, m.SectionName, t.TK_AtL_LogType, FullName
        SQL;

    public function __construct(
        private readonly BigQueryClient $bigQuery,
        private readonly PreviousShiftCalculator $shiftCalculator,
        private readonly TruckAssignmentService $assignmentService,
    ) {}

    /**
     * @return array{masterlist: BigQuerySyncLog, attendance: BigQuerySyncLog}
     */
    public function syncAll(string $triggeredBy): array
    {
        return [
            'masterlist' => $this->syncMasterlist($triggeredBy),
            'attendance' => $this->syncOnDutyStatus($triggeredBy),
        ];
    }

    public function syncMasterlist(string $triggeredBy): BigQuerySyncLog
    {
        $startedAt = now();

        try {
            $rows = $this->bigQuery->runQuery(self::MASTERLIST_SQL);
        } catch (Throwable $e) {
            Log::warning('Driver Assignment: masterlist BigQuery sync failed', ['error' => $e->getMessage()]);

            return $this->logResult('masterlist', $triggeredBy, $startedAt, false, null, $e->getMessage());
        }

        if ($rows === []) {
            // Zero rows is far more likely a misconfigured query/permission
            // problem than "every Prime Mover Driver just left the company"
            // - skip the deactivation pass rather than silently unassigning
            // every truck, and surface it as a failed sync so it gets noticed.
            Log::warning('Driver Assignment: masterlist sync returned zero rows, skipping deactivation pass');

            return $this->logResult('masterlist', $triggeredBy, $startedAt, false, 0, 'Zero rows returned - skipped to avoid deactivating every driver.');
        }

        DB::transaction(function () use ($rows) {
            $seenIds = [];

            foreach ($rows as $row) {
                $employeeId = (string) ($row['EmployeeID'] ?? '');
                if ($employeeId === '') {
                    continue;
                }
                $seenIds[] = $employeeId;

                Driver::query()->updateOrCreate(
                    ['employee_id' => $employeeId],
                    [
                        'full_name' => (string) ($row['FullName'] ?? ''),
                        'designation' => (string) ($row['Designation'] ?? 'Prime Mover Driver'),
                        'is_active' => true,
                        'last_masterlist_synced_at' => now(),
                    ]
                );
            }

            // Anyone active locally but absent from this fetch has left the
            // masterlist (resigned/transferred) - deactivate, never delete,
            // and end their active truck assignment since they shouldn't
            // keep "owning" a truck once gone.
            $droppedDrivers = Driver::query()
                ->where('is_active', true)
                ->whereNotIn('employee_id', $seenIds)
                ->get();

            foreach ($droppedDrivers as $driver) {
                $driver->update(['is_active' => false, 'on_duty' => false, 'on_duty_since' => null]);

                $activeAssignment = $driver->activeAssignment()->first();
                if ($activeAssignment) {
                    $this->assignmentService->unassign($activeAssignment->truck, null, 'driver_deactivated');
                }
            }
        });

        return $this->logResult('masterlist', $triggeredBy, $startedAt, true, count($rows));
    }

    public function syncOnDutyStatus(string $triggeredBy): BigQuerySyncLog
    {
        $startedAt = now();
        $shift = $this->shiftCalculator->currentInProgress();

        try {
            $rows = $this->bigQuery->runQuery(self::ATTENDANCE_SQL, [
                'start_time' => $shift['start'],
                'end_time' => $shift['end'],
            ]);
        } catch (Throwable $e) {
            Log::warning('Driver Assignment: attendance BigQuery sync failed', ['error' => $e->getMessage()]);

            return $this->logResult('attendance', $triggeredBy, $startedAt, false, null, $e->getMessage());
        }

        if ($rows === []) {
            // Zero rows is far more likely a BigQuery hiccup (quota, network
            // blip, the unpartitioned-table perf issue) than "every on-duty
            // driver clocked out this instant" - skip the reset pass rather
            // than wiping on_duty for every real driver, and surface it as a
            // failed sync so it gets noticed. (Same guard as syncMasterlist().)
            Log::warning('Driver Assignment: attendance sync returned zero rows, skipping on-duty reset pass');

            return $this->logResult('attendance', $triggeredBy, $startedAt, false, 0, 'Zero rows returned - skipped to avoid wiping on-duty status for every driver.');
        }

        DB::transaction(function () use ($rows) {
            $byEmployee = [];
            foreach ($rows as $row) {
                $employeeId = (string) ($row['EmployeeID'] ?? '');
                $logType = $row['LogType'] ?? null;
                $time = $row['BiometricTime'] ?? '';

                if ($employeeId === '' || $logType === null || $time === '') {
                    continue;
                }

                $byEmployee[$employeeId][$logType] = $time;
            }

            // Reset first (zero attendance rows this run is expected right
            // after a shift starts - nobody's scanned in yet) so anyone who
            // no longer has an open IN in this window drops off cleanly.
            // (Rows here are non-empty per the guard above; this only clears
            // drivers who dropped out of the current window, not everyone.)
            Driver::query()->where('is_active', true)->update([
                'on_duty' => false,
                'on_duty_since' => null,
                'last_attendance_synced_at' => now(),
            ]);

            foreach ($byEmployee as $employeeId => $scans) {
                if (! isset($scans['IN']) || isset($scans['OUT'])) {
                    continue; // no IN yet this shift, or already clocked OUT -> not on duty
                }

                $driver = Driver::query()->where('employee_id', $employeeId)->first();

                if (! $driver) {
                    Log::warning('Driver Assignment: attendance row for unknown employee_id, skipped', ['employee_id' => $employeeId]);

                    continue;
                }

                $driver->update(['on_duty' => true, 'on_duty_since' => $scans['IN']]);
            }
        });

        return $this->logResult('attendance', $triggeredBy, $startedAt, true, count($rows));
    }

    private function logResult(
        string $syncType,
        string $triggeredBy,
        DateTimeInterface $startedAt,
        bool $success,
        ?int $rowsSynced,
        ?string $errorMessage = null,
    ): BigQuerySyncLog {
        return BigQuerySyncLog::create([
            'sync_type' => $syncType,
            'status' => $success ? 'success' : 'failed',
            'triggered_by' => $triggeredBy,
            'started_at' => $startedAt,
            'finished_at' => now(),
            'rows_synced' => $rowsSynced,
            'error_message' => $errorMessage,
        ]);
    }
}
