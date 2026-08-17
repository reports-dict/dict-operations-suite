<?php

namespace App\Services\Operations\DriverAssignment;

use App\Services\Operations\DriverAssignment\Contracts\BigQueryClient;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

class DriverBiometricLogService
{
    // Raw per-scan biometric log rows - same JOIN/WHERE scoping as
    // DriverAssignmentSyncService::ATTENDANCE_SQL (Prime Mover Driver,
    // Terminal/ECD machines 44/78/85/87) but with the GROUP BY/MIN()
    // aggregation removed, since that collapses each employee's scans down
    // to one earliest-IN/earliest-OUT row per shift window (built for
    // on-duty detection) rather than showing every individual scan event.
    private const BIOMETRIC_LOGS_SQL = <<<'SQL'
        SELECT
          m.EmployeeID AS EmployeeID,
          CONCAT(m.LastName, ', ', m.FirstName) AS FullName,
          CASE WHEN t.TK_AtL_MachNo IN (44, 78, 85) THEN 'TERMINAL' ELSE 'ECD' END AS Location,
          m.DepartmentName AS Department,
          m.SectionName AS Section,
          m.Designation,
          FORMAT_DATETIME('%Y-%m-%d %H:%M:%S', t.TK_Atl_LogDateTime) AS LogDateTime,
          CASE WHEN t.TK_AtL_LogType = 0 THEN 'IN' WHEN t.TK_AtL_LogType = 1 THEN 'OUT' END AS LogType
        FROM `anflo-dict-prd.biometric.bio_timelog_logistic` t
        LEFT JOIN `anflo-dict-prd.biometric.bio_masterdata` m ON t.TK_AtL_EmpID = CAST(m.EmployeeID AS STRING)
        LEFT JOIN `anflo-dict-prd.dbo.dim_machine` dm ON t.TK_AtL_MachNo = dm.MachineNo
        WHERE
          t.TK_Atl_LogDateTime >= @start_time
          AND t.TK_Atl_LogDateTime <= @end_time
          AND m.CompanyShortName = 'DICT'
          AND m.EmployeeID IS NOT NULL
          AND (dm.MachineNo IS NULL OR dm.MachineNo != 89)
          AND t.TK_AtL_MachNo IN (44, 78, 85, 87)
          AND m.LastName IS NOT NULL
          AND m.FirstName IS NOT NULL
          AND UPPER(m.LastName) != 'NULL'
          AND UPPER(m.FirstName) != 'NULL'
          AND m.Designation = 'Prime Mover Driver'
        SQL;

    public function __construct(private readonly BigQueryClient $bigQuery) {}

    /**
     * @return Collection<int, array{employee_id: string, full_name: string, department: string, section: string, log_type: string, log_datetime: string, location: string}>
     */
    public function fetch(Carbon $start, Carbon $end, ?string $logType): Collection
    {
        $sql = self::BIOMETRIC_LOGS_SQL;
        $parameters = ['start_time' => $start, 'end_time' => $end];

        // TK_AtL_LogType is an int column (0=IN, 1=OUT) - the IN/OUT string
        // only exists in the SELECT's CASE. Bind the mapped int, and only
        // append the clause when a filter was actually chosen - the SDK
        // can't infer a BigQuery type for a bare PHP null, so an
        // "@log_type IS NULL OR ..." clause isn't an option here.
        $logTypeInt = match ($logType) {
            'IN' => 0,
            'OUT' => 1,
            default => null,
        };

        if ($logTypeInt !== null) {
            $sql .= "\n  AND t.TK_AtL_LogType = @log_type";
            $parameters['log_type'] = $logTypeInt;
        }

        $sql .= "\nORDER BY t.TK_Atl_LogDateTime DESC";

        $rows = $this->bigQuery->runQuery($sql, $parameters);

        return collect($rows)->map(fn (array $row) => [
            'employee_id' => (string) ($row['EmployeeID'] ?? ''),
            'full_name' => (string) ($row['FullName'] ?? ''),
            'department' => (string) ($row['Department'] ?? ''),
            'section' => (string) ($row['Section'] ?? ''),
            'log_type' => (string) ($row['LogType'] ?? ''),
            'log_datetime' => (string) ($row['LogDateTime'] ?? ''),
            'location' => (string) ($row['Location'] ?? ''),
        ]);
    }
}
