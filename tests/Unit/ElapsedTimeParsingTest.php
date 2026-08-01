<?php

use App\Services\Operations\RoadQueueCaptureService;
use App\Services\Operations\RoadQueueEcdCaptureService;

it('flags elapsed_time strings as >=1hr correctly', function (string $elapsedTime, bool $expected) {
    expect((new RoadQueueCaptureService)->isElapsedTimeOneHourOrMore($elapsedTime))->toBe($expected);
    expect((new RoadQueueEcdCaptureService)->isElapsedTimeOneHourOrMore($elapsedTime))->toBe($expected);
})->with([
    'under an hour' => ['0D 0H 45M', false],
    'exactly one hour' => ['0D 1H 0M', true],
    'multiple days' => ['2D 0H 0M', true],
    'empty string' => ['', false],
]);
