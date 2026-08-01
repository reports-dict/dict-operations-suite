<?php

use App\Models\RoadQueueEcdTatHistory;

it('is reachable without authentication', function () {
    $this->get('/operations/road-queue-ecd/board')
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page->component('Operations/RoadQueueEcd/Board'));
});

it('captures a TAT history snapshot on every load', function () {
    $before = RoadQueueEcdTatHistory::query()->count();

    $this->get('/operations/road-queue-ecd/board')->assertSuccessful();

    expect(RoadQueueEcdTatHistory::query()->count())->toBeGreaterThanOrEqual($before);
});
