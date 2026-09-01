<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('operations:purge-history')->dailyAt('02:00');

// Shift start + one-hour catch-up, both shifts (Day 07:00-19:00 / Night
// 19:00-07:00, Asia/Manila) - see PreviousShiftCalculator::currentInProgress().
Schedule::command('operations:sync-driver-assignment')->dailyAt('07:00');
Schedule::command('operations:sync-driver-assignment')->dailyAt('08:00');
Schedule::command('operations:sync-driver-assignment')->dailyAt('19:00');
Schedule::command('operations:sync-driver-assignment')->dailyAt('20:00');

Schedule::command('operations:sync-vessel-dashboard')->hourly();

// Keeps vessel_schedules synced from sparcsn4 even when nobody has the
// public kiosk board or Management page open (both also sync on every
// load/poll - see VesselDashboardDataController - but the board may be
// powered off for a stretch, e.g. off-hours, so this is the backup
// baseline). Hourly matches the sibling operations:sync-vessel-dashboard
// job just above, for the same module/connection.
Schedule::command('operations:sync-vessel-schedule')->hourly();

// 5 minutes matches the source app's proven cadence (see
// local-simplified-xps-v2's MSSQL_SYNC_SETUP.md / sync-containers.bat).
Schedule::command('app:sync-container-yard')->everyFiveMinutes()->withoutOverlapping();

// Keeps history accumulating even when no one has the public kiosk board
// open in a browser (the board's own load/60s-poll also captures a
// snapshot - see RoadQueueBoardController / RoadQueueEcdBoardController).
// High-elapsed monitoring is live and needs frequent polling; TAT only
// reflects the previous *completed* shift (fixed the instant it ends), so
// it's scheduled around shift boundaries instead of every minute to avoid
// hammering the read-only sparcsn4 connection for data that can't change.
Schedule::command('operations:capture-road-queue --only-high-elapsed')->everyMinute();
Schedule::command('operations:capture-road-queue-ecd --only-high-elapsed')->everyMinute();

// Shift start + one-hour catch-up, both shifts (Day 07:00-19:00 / Night
// 19:00-07:00), explicitly pinned to Asia/Manila - see
// PreviousShiftCalculator::current(). Unlike operations:sync-driver-assignment
// above, ->timezone() is set here since config('app.timezone') is UTC and
// would otherwise fire these 8h off from actual shift boundaries.
Schedule::command('operations:capture-road-queue --only-tat')->timezone('Asia/Manila')->dailyAt('07:00');
Schedule::command('operations:capture-road-queue --only-tat')->timezone('Asia/Manila')->dailyAt('08:00');
Schedule::command('operations:capture-road-queue --only-tat')->timezone('Asia/Manila')->dailyAt('19:00');
Schedule::command('operations:capture-road-queue --only-tat')->timezone('Asia/Manila')->dailyAt('20:00');

Schedule::command('operations:capture-road-queue-ecd --only-tat')->timezone('Asia/Manila')->dailyAt('07:00');
Schedule::command('operations:capture-road-queue-ecd --only-tat')->timezone('Asia/Manila')->dailyAt('08:00');
Schedule::command('operations:capture-road-queue-ecd --only-tat')->timezone('Asia/Manila')->dailyAt('19:00');
Schedule::command('operations:capture-road-queue-ecd --only-tat')->timezone('Asia/Manila')->dailyAt('20:00');
