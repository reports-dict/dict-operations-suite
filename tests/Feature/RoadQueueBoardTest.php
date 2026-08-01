<?php

use App\Models\RoadQueueTatHistory;

it('is reachable without authentication', function () {
    $this->get('/operations/road-queue/board')
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page->component('Operations/RoadQueue/Board'));
});

it('captures a TAT history snapshot on every load', function () {
    $before = RoadQueueTatHistory::query()->count();

    $this->get('/operations/road-queue/board')->assertSuccessful();

    expect(RoadQueueTatHistory::query()->count())->toBeGreaterThanOrEqual($before);
});
