<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Services\Operations\DriverAssignment\DriverBiometricLogService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class DriverAssignmentLogsController extends Controller
{
    // BigQuery bills per data scanned and bio_timelog_logistic is
    // unpartitioned - require both ends of the range and cap its width
    // rather than allowing an open-ended scan (same spirit as
    // ReeferPluginReportController requiring date_from before querying).
    private const MAX_RANGE_DAYS = 31;

    public function index(Request $request, DriverBiometricLogService $service): InertiaResponse
    {
        [$filters, $rows, $error] = $this->fetchRows($request, $service);

        // Sent unpaginated/unsorted-by-request (already DB-ordered by
        // log_datetime desc) - search, per-column filters, sort, and
        // pagination all happen client-side against this one fetch, so
        // interacting with the table never re-queries BigQuery. Only
        // changing Start/End/Log Type and clicking Apply issues a new
        // request here.
        return Inertia::render('Operations/DriverAssignment/Logs', [
            'rows' => $rows->values()->all(),
            'filters' => $filters,
            'error' => $error,
        ]);
    }

    public function export(Request $request, DriverBiometricLogService $service): StreamedResponse
    {
        [, $rows] = $this->fetchRows($request, $service);

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->fromArray(
            ['Employee ID', 'Employee Name', 'Department', 'Section', 'Log Type', 'Log Date/Time', 'Location'],
            null,
            'A1',
        );

        $r = 2;
        foreach ($rows as $row) {
            $sheet->fromArray([
                $row['employee_id'],
                $row['full_name'],
                $row['department'],
                $row['section'],
                $row['log_type'],
                $row['log_datetime'],
                $row['location'],
            ], null, "A{$r}");
            $r++;
        }

        return $this->streamXlsx($spreadsheet, 'biometric_logs.xlsx');
    }

    /**
     * Shared by index()/export() - filter parsing, range validation, and
     * fetch. No sort/page params - both are client-side only now.
     *
     * @return array{0: array, 1: Collection, 2: string|null}
     */
    private function fetchRows(Request $request, DriverBiometricLogService $service): array
    {
        $filters = [
            'start_datetime' => $request->string('start_datetime')->toString() ?: null,
            'end_datetime' => $request->string('end_datetime')->toString() ?: null,
            'log_type' => $request->string('log_type')->toString() ?: null,
        ];

        $rows = new Collection;
        $error = null;

        if ($filters['start_datetime'] && $filters['end_datetime']) {
            try {
                $start = Carbon::parse($filters['start_datetime']);
                $end = Carbon::parse($filters['end_datetime']);
            } catch (Throwable) {
                $start = $end = null;
                $error = 'Invalid start or end date/time.';
            }

            if (isset($start, $end)) {
                if ($end->lt($start)) {
                    $error = 'End must be on or after Start.';
                } elseif ($start->diffInDays($end) > self::MAX_RANGE_DAYS) {
                    $error = 'The selected range is too wide - please select '.self::MAX_RANGE_DAYS.' days or fewer.';
                } else {
                    $rows = $service->fetch($start, $end, $filters['log_type']);
                }
            }
        }

        return [$filters, $rows, $error];
    }

    private function streamXlsx(Spreadsheet $spreadsheet, string $filename): StreamedResponse
    {
        $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');

        return Response::streamDownload(fn () => $writer->save('php://output'), $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}
