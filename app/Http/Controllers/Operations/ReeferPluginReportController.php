<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Services\Operations\ReeferPluginPerContainerService;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class ReeferPluginReportController extends Controller
{
    public function __invoke(Request $request, ReeferPluginPerContainerService $service): Response
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
        ]);
    }
}
