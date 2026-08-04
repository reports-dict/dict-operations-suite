<?php

use App\Models\RoadQueueHighElapsedTransaction;
use App\Models\RoadQueueTatHistory;

it('captures a TAT history snapshot when run', function () {
    $before = RoadQueueTatHistory::query()->count();

    $this->artisan('operations:capture-road-queue')->assertSuccessful();

    expect(RoadQueueTatHistory::query()->count())->toBeGreaterThanOrEqual($before);
});

it('--only-high-elapsed does not touch TAT history', function () {
    $before = RoadQueueTatHistory::query()->count();

    $this->artisan('operations:capture-road-queue', ['--only-high-elapsed' => true])->assertSuccessful();

    expect(RoadQueueTatHistory::query()->count())->toBe($before);
});

it('--only-tat does not touch high-elapsed transactions', function () {
    $before = RoadQueueHighElapsedTransaction::query()->count();

    $this->artisan('operations:capture-road-queue', ['--only-tat' => true])->assertSuccessful();

    expect(RoadQueueHighElapsedTransaction::query()->count())->toBe($before);
});
