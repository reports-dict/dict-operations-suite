<?php

use App\Services\Operations\Support\PreviousShiftCalculator;
use Illuminate\Support\Carbon;

afterEach(function () {
    Carbon::setTestNow();
});

it('resolves the previous shift at each day/night boundary', function (string $now, string $label, string $start, string $end) {
    Carbon::setTestNow(Carbon::parse($now, 'Asia/Manila'));

    $shift = (new PreviousShiftCalculator)->current();

    expect($shift['label'])->toBe($label);
    expect($shift['start'])->toBe($start.'.000');
    expect($shift['end'])->toBe($end.'.000');
})->with([
    'just before day shift starts (06:59:59) -> previous is yesterday\'s day shift' => [
        '2026-07-27 06:59:59', 'Day Shift', '2026-07-26 07:00:00', '2026-07-26 19:00:00',
    ],
    'day shift starts exactly (07:00:00) -> previous is last night shift' => [
        '2026-07-27 07:00:00', 'Night Shift', '2026-07-26 19:00:00', '2026-07-27 07:00:00',
    ],
    'just before night shift starts (18:59:59) -> previous is last night shift' => [
        '2026-07-27 18:59:59', 'Night Shift', '2026-07-26 19:00:00', '2026-07-27 07:00:00',
    ],
    'night shift starts exactly (19:00:00) -> previous is today\'s day shift' => [
        '2026-07-27 19:00:00', 'Day Shift', '2026-07-27 07:00:00', '2026-07-27 19:00:00',
    ],
    'just before midnight (23:59:59) -> previous is today\'s day shift' => [
        '2026-07-27 23:59:59', 'Day Shift', '2026-07-27 07:00:00', '2026-07-27 19:00:00',
    ],
    'midnight exactly (00:00:00) -> previous is yesterday\'s day shift' => [
        '2026-07-27 00:00:00', 'Day Shift', '2026-07-26 07:00:00', '2026-07-26 19:00:00',
    ],
]);

it('resolves the in-progress shift at each day/night boundary', function (string $now, string $label, string $start) {
    Carbon::setTestNow(Carbon::parse($now, 'Asia/Manila'));

    $shift = (new PreviousShiftCalculator)->currentInProgress();

    expect($shift['label'])->toBe($label);
    expect($shift['start']->format('Y-m-d H:i:s'))->toBe($start);
    expect($shift['end']->format('Y-m-d H:i:s'))->toBe($now);
})->with([
    'just before day shift starts (06:59:59) -> in-progress is last night shift' => [
        '2026-07-27 06:59:59', 'Night Shift', '2026-07-26 19:00:00',
    ],
    'day shift starts exactly (07:00:00) -> in-progress is today\'s day shift' => [
        '2026-07-27 07:00:00', 'Day Shift', '2026-07-27 07:00:00',
    ],
    'just before night shift starts (18:59:59) -> in-progress is today\'s day shift' => [
        '2026-07-27 18:59:59', 'Day Shift', '2026-07-27 07:00:00',
    ],
    'night shift starts exactly (19:00:00) -> in-progress is today\'s night shift' => [
        '2026-07-27 19:00:00', 'Night Shift', '2026-07-27 19:00:00',
    ],
    'just before midnight (23:59:59) -> in-progress is today\'s night shift' => [
        '2026-07-27 23:59:59', 'Night Shift', '2026-07-27 19:00:00',
    ],
    'midnight exactly (00:00:00) -> in-progress is last night shift' => [
        '2026-07-27 00:00:00', 'Night Shift', '2026-07-26 19:00:00',
    ],
]);
