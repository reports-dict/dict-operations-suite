<?php

use App\Models\RoadQueueEcdHighElapsedTransaction;
use App\Models\RoadQueueEcdTatHistory;

it('captures a TAT history snapshot when run', function () {
    $before = RoadQueueEcdTatHistory::query()->count();

    $this->artisan('operations:capture-road-queue-ecd')->assertSuccessful();

    expect(RoadQueueEcdTatHistory::query()->count())->toBeGreaterThanOrEqual($before);
});

it('--only-high-elapsed does not touch TAT history', function () {
    $before = RoadQueueEcdTatHistory::query()->count();

    $this->artisan('operations:capture-road-queue-ecd', ['--only-high-elapsed' => true])->assertSuccessful();

    expect(RoadQueueEcdTatHistory::query()->count())->toBe($before);
});

it('--only-tat does not touch high-elapsed transactions', function () {
    $before = RoadQueueEcdHighElapsedTransaction::query()->count();

    $this->artisan('operations:capture-road-queue-ecd', ['--only-tat' => true])->assertSuccessful();

    expect(RoadQueueEcdHighElapsedTransaction::query()->count())->toBe($before);
});
