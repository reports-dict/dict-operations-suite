<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Services\Operations\ReeferPluginPerCategoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReeferPluginPerCategoryController extends Controller
{
    public function index(Request $request, ReeferPluginPerCategoryService $service): InertiaResponse
    {
        $rows = $this->fetchRows($request, $service);

        return Inertia::render('Operations/ReeferPluginReport/PerCategory', [
            'rows' => $rows,
            'filters' => $this->filters($request),
        ]);
    }

    public function export(Request $request, ReeferPluginPerCategoryService $service): StreamedResponse
    {
        $rows = $this->fetchRows($request, $service);

        $totalHours = round($rows->sum('total_plugin_hours'), 2);
        $totalContainers = $rows->sum('total_containers');
        $averageHours = $totalContainers > 0 ? round($totalHours / $totalContainers, 2) : 0.0;

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->fromArray(['Category', 'Total Containers', 'Connect/Disconnect', 'Plug-in Hours'], null, 'A1');

        $r = 2;
        foreach ($rows as $row) {
            $sheet->fromArray([
                $row['category'],
                $row['total_containers'],
                $row['total_connect_disconnect'],
                $row['total_plugin_hours'],
            ], null, "A{$r}");
            $r++;
        }

        $r++;
        $sheet->fromArray(['Overall Total', null, null, $totalHours], null, "A{$r}");
        $r++;
        $sheet->fromArray(['Average Total Hours', null, null, $averageHours], null, "A{$r}");

        return $this->streamXlsx($spreadsheet, 'reefer_plugin_per_category.xlsx');
    }

    /**
     * @return array{date_from: ?string, date_to: ?string, category: string}
     */
    private function filters(Request $request): array
    {
        return [
            'date_from' => $request->string('date_from')->toString() ?: null,
            'date_to' => $request->string('date_to')->toString() ?: null,
            'category' => $request->string('category')->toString() ?: 'both',
        ];
    }

    private function fetchRows(Request $request, ReeferPluginPerCategoryService $service): Collection
    {
        $filters = $this->filters($request);

        // Without a date_from lower bound this query scans the full srv_event
        // history and is prohibitively slow (confirmed against the live
        // sparcsn4 connection) - never run it until the user supplies one,
        // including on the initial page load.
        return $filters['date_from']
            ? $service->summarize($filters['date_from'], $filters['date_to'], $filters['category'])
            : new Collection;
    }

    private function streamXlsx(Spreadsheet $spreadsheet, string $filename): StreamedResponse
    {
        $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');

        return Response::streamDownload(fn () => $writer->save('php://output'), $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}
