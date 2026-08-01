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
