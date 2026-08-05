<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Services\Operations\ReeferPluginPerContainerService;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReeferPluginReportController extends Controller
{
    public function index(Request $request, ReeferPluginPerContainerService $service): InertiaResponse
    {
        [$filters, $sort, $direction, $rows] = $this->fetchRows($request, $service);

        $totalHours = round($rows->sum('total_plugin_hours'), 2);
        $averageHours = $rows->isNotEmpty() ? round($totalHours / $rows->count(), 2) : 0.0;

        $page = $request->integer('page', 1);
        $perPage = 10;
        $paginated = new LengthAwarePaginator(
            $rows->forPage($page, $perPage)->values(),
            $rows->count(),
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()],
        );

        return Inertia::render('Operations/ReeferPluginReport/Index', [
            'rows' => $paginated,
            'filters' => $filters,
            'sort' => $sort,
            'direction' => $direction,
            'summary' => ['total_hours' => $totalHours, 'average_hours' => $averageHours],
        ]);
    }

    public function export(Request $request, ReeferPluginPerContainerService $service): StreamedResponse
    {
        [, , , $rows] = $this->fetchRows($request, $service);

        $totalHours = round($rows->sum('total_plugin_hours'), 2);
        $averageHours = $rows->isNotEmpty() ? round($totalHours / $rows->count(), 2) : 0.0;

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->fromArray(
            ['Container', 'Category', 'Transit State', 'Plug-in Hours', 'Connect/Disconnect', 'Line Operator', 'ISO Type', 'Visit'],
            null,
            'A1',
        );

        $r = 2;
        foreach ($rows as $row) {
            $sheet->fromArray([
                $row['container'],
                $row['category'],
                $row['transit_state'],
                $row['total_plugin_hours'],
                $row['total_connect_disconnect'],
                $row['line_op'],
                $row['type_iso'],
                "{$row['visit_index']}/{$row['total_visits']}",
            ], null, "A{$r}");
            $r++;
        }

        $r++;
        $sheet->fromArray(['Total Hours', $totalHours], null, "A{$r}");
        $r++;
        $sheet->fromArray(['Average Total Hours', $averageHours], null, "A{$r}");

        return $this->streamXlsx($spreadsheet, 'reefer_plugin_per_container.xlsx');
    }

    /**
     * Shared by index()/export() - filter parsing, fetch, sort, and
     * visit_index/total_visits tagging, before either pagination (index) or
     * a full unpaginated export.
     *
     * @return array{0: array, 1: string, 2: string, 3: Collection}
     */
    private function fetchRows(Request $request, ReeferPluginPerContainerService $service): array
    {
        $filters = [
            'date_from' => $request->string('date_from')->toString() ?: null,
            'date_to' => $request->string('date_to')->toString() ?: null,
            'category' => $request->string('category')->toString() ?: 'both',
        ];

        $sort = $request->string('sort')->toString() ?: 'time_in';
        $direction = $request->string('direction')->toString() === 'asc' ? 'asc' : 'desc';

        // Without a date_from lower bound this query scans the full srv_event
        // history and is prohibitively slow/can outright error (confirmed
        // against the live sparcsn4 connection while building Per Category) -
        // never run it until the user supplies one, including on first load.
        $rows = $filters['date_from']
            ? $service->fetch($filters['date_from'], $filters['date_to'], $filters['category'])
            : new Collection;

        $rows = $rows->sortBy($sort, SORT_REGULAR, $direction === 'desc')->values();

        // Duplicate containers are a real, expected case (re-plugged after
        // gate-out/return) - surface it rather than de-duplicating, per
        // APP REQUIREMENT.md.
        $visitCounts = $rows->countBy('container');
        $seen = [];
        $rows = $rows->map(function ($row) use ($visitCounts, &$seen) {
            $seen[$row['container']] = ($seen[$row['container']] ?? 0) + 1;

            return [
                ...$row,
                'visit_index' => $seen[$row['container']],
                'total_visits' => $visitCounts[$row['container']],
            ];
        });

        return [$filters, $sort, $direction, $rows];
    }

    private function streamXlsx(Spreadsheet $spreadsheet, string $filename): StreamedResponse
    {
        $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');

        return Response::streamDownload(fn () => $writer->save('php://output'), $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}
