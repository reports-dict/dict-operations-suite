<?php

namespace App\Http\Controllers\Operations;

use App\Http\Controllers\Controller;
use App\Models\RoadQueueEcdHighElapsedTransaction;
use App\Models\RoadQueueEcdTatHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Response;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class RoadQueueEcdHistoryController extends Controller
{
    private const PER_PAGE = 20;

    public function index(Request $request): InertiaResponse
    {
        $filters = $this->filters($request);

        $tatHistory = $this->tatQuery($filters)
            ->paginate(self::PER_PAGE, ['*'], 'tat_page', $filters['tat_page'])
            ->withQueryString();

        $transactions = $this->transactionsQuery($filters)
            ->paginate(self::PER_PAGE, ['*'], 'tx_page', $filters['tx_page'])
            ->withQueryString();

        return Inertia::render('Operations/RoadQueueEcd/History', [
            'tatHistory' => $tatHistory,
            'transactions' => $transactions,
            'filters' => $filters,
        ]);
    }

    public function exportTat(Request $request): StreamedResponse
    {
        $filters = $this->filters($request);
        $records = $this->tatQuery($filters)->get();

        return Response::streamDownload(function () use ($records) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, [
                'ID', 'Shift', 'Shift Start (PH)', 'Shift End (PH)', 'Avg TAT', 'Avg TAT (seconds)',
                'Containers Processed', 'Recorded At (PH)',
            ]);
            foreach ($records as $row) {
                fputcsv($handle, [
                    $row->id,
                    $row->shift_label,
                    $this->toPh($row->shift_start),
                    $this->toPh($row->shift_end),
                    $row->avg_tat,
                    $row->avg_tat_seconds,
                    $row->container_count,
                    $this->toPh($row->recorded_at),
                ]);
            }
            fclose($handle);
        }, 'tat_history.csv', ['Content-Type' => 'text/csv']);
    }

    public function exportTransactions(Request $request): StreamedResponse
    {
        $filters = $this->filters($request);
        $records = $this->transactionsQuery($filters)->get();

        return Response::streamDownload(function () use ($records) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, [
                'ID', 'Container', 'Category', 'Truck Entered Yard (PH)',
                'Elapsed Time', 'Assigned CHE', 'ISO Type', 'Truck License',
                'Trucking Company', 'Freight Kind', 'Line Op', 'FROM', 'TO', 'BAT#',
                'First Captured At (PH)', 'Last Seen At (PH)',
            ]);
            foreach ($records as $row) {
                fputcsv($handle, [
                    $row->id,
                    $row->container,
                    $row->category,
                    $this->toPh($row->truck_visit_entered_yard),
                    $row->elapsed_time,
                    $row->assigned_che,
                    $row->type_iso,
                    $row->ob_carrier,
                    $row->trucking_company,
                    $row->freight_kind,
                    $row->line_op,
                    $row->pos_slot_from,
                    $row->pos_slot,
                    $row->bat_nbr,
                    $this->toPh($row->first_captured_at),
                    $this->toPh($row->last_seen_at),
                ]);
            }
            fclose($handle);
        }, 'high_elapsed_transactions.csv', ['Content-Type' => 'text/csv']);
    }

    private function filters(Request $request): array
    {
        return [
            'tat_shift' => $request->string('tat_shift')->toString() ?: null,
            'tat_from' => $request->string('tat_from')->toString() ?: null,
            'tat_to' => $request->string('tat_to')->toString() ?: null,
            'tx_container' => $request->string('tx_container')->toString() ?: null,
            'tx_category' => $request->string('tx_category')->toString() ?: null,
            'tat_page' => $request->integer('tat_page', 1),
            'tx_page' => $request->integer('tx_page', 1),
        ];
    }

    private function tatQuery(array $filters)
    {
        return RoadQueueEcdTatHistory::query()
            ->when($filters['tat_shift'], fn ($q) => $q->where('shift_label', $filters['tat_shift']))
            ->when($filters['tat_from'], fn ($q) => $q->where('shift_start', '>=', Carbon::parse($filters['tat_from'])->startOfDay()))
            ->when($filters['tat_to'], fn ($q) => $q->where('shift_end', '<=', Carbon::parse($filters['tat_to'])->endOfDay()))
            ->orderByDesc('recorded_at');
    }

    private function transactionsQuery(array $filters)
    {
        return RoadQueueEcdHighElapsedTransaction::query()
            ->when($filters['tx_container'], fn ($q) => $q->where('container', 'like', '%'.$filters['tx_container'].'%'))
            ->when($filters['tx_category'], fn ($q) => $q->where('category', $filters['tx_category']))
            ->orderByDesc('first_captured_at');
    }

    private function toPh($value): string
    {
        if (! $value) {
            return '';
        }

        try {
            return Carbon::parse($value)->setTimezone('Asia/Manila')->format('M d, Y h:i A');
        } catch (\Exception) {
            return (string) $value;
        }
    }
}
