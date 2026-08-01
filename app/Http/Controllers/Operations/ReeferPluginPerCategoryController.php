<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Services\Operations\ReeferPluginPerCategoryService;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class ReeferPluginPerCategoryController extends Controller
{
    public function __invoke(Request $request, ReeferPluginPerCategoryService $service): Response
    {
        $filters = [
            'date_from' => $request->string('date_from')->toString() ?: null,
            'date_to' => $request->string('date_to')->toString() ?: null,
            'category' => $request->string('category')->toString() ?: 'both',
        ];

        // Without a date_from lower bound this query scans the full srv_event
        // history and is prohibitively slow (confirmed against the live
        // sparcsn4 connection) - never run it until the user supplies one,
        // including on the initial page load.
        $rows = $filters['date_from']
            ? $service->summarize($filters['date_from'], $filters['date_to'], $filters['category'])
            : new Collection;

        return Inertia::render('Operations/ReeferPluginReport/PerCategory', [
            'rows' => $rows,
            'filters' => $filters,
        ]);
    }
}
