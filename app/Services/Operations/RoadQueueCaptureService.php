<?php

namespace App\Services\Operations;

use App\Models\RoadQueueHighElapsedTransaction;
use App\Models\RoadQueueTatHistory;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

class RoadQueueCaptureService
{
    /**
     * Snapshot side effects ported verbatim from xps-road-queue's
     * RoadQueueController - run on every board load so history accumulates
     * without any separate job. Wrapped in try/catch per-record so a capture
     * failure never breaks the public board render.
     */
    public function captureTatHistory(array $shift, string $status, ?string $avgTat, ?int $containerCount = null): void
    {
        try {
            $tatSeconds = 0;
            if ($avgTat && preg_match('/(\d+)\s*min\s*(\d+)\s*sec/', $avgTat, $m)) {
                $tatSeconds = (int) $m[1] * 60 + (int) $m[2];
            }

            RoadQueueTatHistory::query()->firstOrCreate(
                [
                    'shift_start' => Carbon::parse($shift['start']),
                    'shift_end' => Carbon::parse($shift['end']),
                    'status' => $status,
                ],
                [
                    'shift_label' => $shift['label'],
                    'avg_tat' => $avgTat,
                    'avg_tat_seconds' => $tatSeconds,
                    'container_count' => $containerCount,
                    'recorded_at' => now(),
                ]
            );
        } catch (\Exception $e) {
            Log::warning('Failed to save Road Queue TAT history', ['error' => $e->getMessage()]);
        }
    }

    public function captureHighElapsedTransactions(Collection $rows): void
    {
        $now = now();

        foreach ($rows as $row) {
            if (! $this->isElapsedTimeOneHourOrMore($row->elapsed_time ?? '')) {
                continue;
            }

            $batNbr = $row->bat_nbr ?? null;
            if (! $batNbr) {
                continue;
            }

            try {
                $record = RoadQueueHighElapsedTransaction::query()->firstOrNew(['bat_nbr' => $batNbr]);

                if (! $record->exists) {
                    $record->first_captured_at = $now;
                }

                $precheckTime = null;
                if (! empty($row->precheck_time)) {
                    try {
                        $precheckTime = Carbon::parse($row->precheck_time);
                    } catch (\Exception) {
                    }
                }

                $record->fill([
                    'container' => $row->container ?? '',
                    'category' => $row->category ?? null,
                    'precheck_time' => $precheckTime,
                    'elapsed_time' => $row->elapsed_time ?? null,
                    'assigned_che' => $row->assigned_che ?? null,
                    'type_iso' => $row->type_iso ?? null,
                    'ob_carrier' => $row->ob_carrier ?? null,
                    'freight_kind' => $row->freight_kind ?? null,
                    'line_op' => $row->line_op ?? null,
                    'pos_slot_from' => $row->pos_slot_from ?? null,
                    'pos_slot' => $row->pos_slot ?? null,
                ]);
                $record->last_seen_at = $now;
                $record->save();
            } catch (\Exception $e) {
                Log::warning('Failed to save Road Queue high-elapsed transaction', [
                    'bat_nbr' => $batNbr,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }

    public function isElapsedTimeOneHourOrMore(string $elapsedTime): bool
    {
        if ($elapsedTime === '') {
            return false;
        }

        $days = 0;
        $hours = 0;
        if (preg_match('/(\d+)D/', $elapsedTime, $m)) {
            $days = (int) $m[1];
        }
        if (preg_match('/(\d+)H/', $elapsedTime, $m)) {
            $hours = (int) $m[1];
        }

        return $days > 0 || $hours >= 1;
    }
}
