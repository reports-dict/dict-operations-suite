<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Services\Operations\ConsigneeService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ConsigneeController extends Controller
{
    /**
     * The full list is sent in one shot rather than paginated server-side -
     * search/sort/pagination all happen client-side against this array
     * (small reference table, no per-keystroke round trip needed).
     */
    public function index(ConsigneeService $service): InertiaResponse
    {
        $rows = $service->fetch()->sortBy('customer_id')->values();

        return Inertia::render('Operations/Consignees/Index', [
            'rows' => $rows,
        ]);
    }

    public function export(Request $request, ConsigneeService $service): StreamedResponse
    {
        $rows = $this->filterAndSort($request, $service->fetch());

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->fromArray(['Customer ID', 'Customer Name'], null, 'A1');

        $r = 2;
        foreach ($rows as $row) {
            $sheet->fromArray([$row['customer_id'], $row['customer_name']], null, "A{$r}");
            $r++;
        }

        return $this->streamXlsx($spreadsheet, 'consignees.xlsx');
    }

    /**
     * Applies the same search/sort the client is currently showing, so the
     * exported file matches what's on screen.
     */
    private function filterAndSort(Request $request, Collection $rows): Collection
    {
        $search = $request->string('search')->toString();
        if ($search) {
            $needle = strtolower($search);
            $rows = $rows->filter(fn ($row) => str_contains(strtolower($row['customer_id']), $needle)
                || str_contains(strtolower($row['customer_name']), $needle));
        }

        $sort = $request->string('sort')->toString() ?: 'customer_id';
        $direction = $request->string('direction')->toString() === 'desc' ? 'desc' : 'asc';

        return $rows->sortBy($sort, SORT_REGULAR, $direction === 'desc')->values();
    }

    private function streamXlsx(Spreadsheet $spreadsheet, string $filename): StreamedResponse
    {
        $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');

        return Response::streamDownload(fn () => $writer->save('php://output'), $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}
