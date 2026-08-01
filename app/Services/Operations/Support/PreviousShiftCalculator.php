<?php

namespace App\Services\Operations\Support;

use Illuminate\Support\Carbon;

class PreviousShiftCalculator
{
    /**
     * Shared by RoadQueueBoardService and RoadQueueEcdBoardService (ported
     * verbatim from both source apps' identical getPreviousShift()). Shifts
     * are hardcoded to Asia/Manila regardless of config('app.timezone') -
     * this reflects the terminal's actual operating shifts, not the app's
     * default timezone.
     *
     * @return array{label: string, range: string, start: string, end: string}
     */
    public function current(): array
    {
        $now = Carbon::now('Asia/Manila');
        $hour = $now->hour;

        if ($hour >= 7 && $hour < 19) {
            // Currently Day Shift → previous was Night Shift
            $start = $now->copy()->subDay()->setTime(19, 0, 0);
            $end = $now->copy()->setTime(7, 0, 0);
            $label = 'Night Shift';
        } elseif ($hour >= 19) {
            // Night Shift just started → previous was today's Day Shift
            $start = $now->copy()->setTime(7, 0, 0);
            $end = $now->copy()->setTime(19, 0, 0);
            $label = 'Day Shift';
        } else {
            // Night Shift ongoing (midnight-7AM) → previous was yesterday's Day Shift
            $start = $now->copy()->subDay()->setTime(7, 0, 0);
            $end = $now->copy()->subDay()->setTime(19, 0, 0);
            $label = 'Day Shift';
        }

        return [
            'label' => $label,
            'range' => $start->format('M d g:i A').' – '.$end->format('M d g:i A'),
            'start' => $start->format('Y-m-d H:i:s').'.000',
            'end' => $end->format('Y-m-d H:i:s').'.000',
        ];
    }

    /**
     * The shift that's in progress *right now* (start = shift start,
     * end = now) - used by the Driver Assignment module's on-duty check,
     * as opposed to current() above which returns the previous *completed*
     * shift (used by Road Queue's TAT-vs-last-shift reporting).
     *
     * @return array{label: string, range: string, start: Carbon, end: Carbon}
     */
    public function currentInProgress(): array
    {
        $now = Carbon::now('Asia/Manila');
        $hour = $now->hour;

        if ($hour >= 7 && $hour < 19) {
            $start = $now->copy()->setTime(7, 0, 0);
            $label = 'Day Shift';
        } elseif ($hour >= 19) {
            $start = $now->copy()->setTime(19, 0, 0);
            $label = 'Night Shift';
        } else {
            $start = $now->copy()->subDay()->setTime(19, 0, 0);
            $label = 'Night Shift';
        }

        return [
            'label' => $label,
            'range' => $start->format('M d g:i A').' – now',
            'start' => $start,
            'end' => $now,
        ];
    }
}
