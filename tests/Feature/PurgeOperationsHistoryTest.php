<?php

use App\Models\RoadQueueEcdHighElapsedTransaction;
use App\Models\RoadQueueEcdTatHistory;
use App\Models\RoadQueueHighElapsedTransaction;
use App\Models\RoadQueueTatHistory;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

function ageRow($model, Carbon $createdAt): void
{
    $model->forceFill(['created_at' => $createdAt])->save();
}

afterEach(function () {
    RoadQueueTatHistory::query()->where('shift_label', 'like', 'purge-test-%')->delete();
    RoadQueueEcdTatHistory::query()->where('shift_label', 'like', 'purge-test-%')->delete();
    RoadQueueHighElapsedTransaction::query()->where('bat_nbr', 'like', 'purge-test-%')->delete();
    RoadQueueEcdHighElapsedTransaction::query()->where('bat_nbr', 'like', 'purge-test-%')->delete();
});

it('dry-run reports counts without deleting anything', function () {
    $old = now()->subMonths(7);
    $recent = now()->subDays(1);

    $oldTat = RoadQueueTatHistory::create([
        'shift_label' => 'purge-test-old', 'shift_start' => $old, 'shift_end' => $old,
        'status' => 'precheck_to_outgate', 'avg_tat' => null, 'avg_tat_seconds' => 0, 'recorded_at' => $old,
    ]);
    ageRow($oldTat, $old);

    $recentTat = RoadQueueTatHistory::create([
        'shift_label' => 'purge-test-recent', 'shift_start' => $recent, 'shift_end' => $recent,
        'status' => 'precheck_to_outgate', 'avg_tat' => null, 'avg_tat_seconds' => 0, 'recorded_at' => $recent,
    ]);
    ageRow($recentTat, $recent);

    $this->artisan('operations:purge-history', ['--months' => 6, '--dry-run' => true])
        ->assertSuccessful();

    expect(RoadQueueTatHistory::find($oldTat->id))->not->toBeNull();
    expect(RoadQueueTatHistory::find($recentTat->id))->not->toBeNull();
});

it('deletes only rows older than the retention period across all four history tables', function () {
    $old = now()->subMonths(7);
    $recent = now()->subDays(1);

    $oldTat = RoadQueueTatHistory::create([
        'shift_label' => 'purge-test-old', 'shift_start' => $old, 'shift_end' => $old,
        'status' => 'precheck_to_outgate', 'avg_tat' => null, 'avg_tat_seconds' => 0, 'recorded_at' => $old,
    ]);
    ageRow($oldTat, $old);

    $recentTat = RoadQueueTatHistory::create([
        'shift_label' => 'purge-test-recent', 'shift_start' => $recent, 'shift_end' => $recent,
        'status' => 'ingate_to_outgate', 'avg_tat' => null, 'avg_tat_seconds' => 0, 'recorded_at' => $recent,
    ]);
    ageRow($recentTat, $recent);

    $oldEcdTat = RoadQueueEcdTatHistory::create([
        'shift_label' => 'purge-test-old', 'shift_start' => $old, 'shift_end' => $old,
        'avg_tat' => null, 'avg_tat_seconds' => 0, 'recorded_at' => $old,
    ]);
    ageRow($oldEcdTat, $old);

    $recentEcdTat = RoadQueueEcdTatHistory::create([
        'shift_label' => 'purge-test-recent', 'shift_start' => $recent, 'shift_end' => $recent,
        'avg_tat' => null, 'avg_tat_seconds' => 0, 'recorded_at' => $recent,
    ]);
    ageRow($recentEcdTat, $recent);

    $oldTx = RoadQueueHighElapsedTransaction::create([
        'container' => 'TEST0000001', 'bat_nbr' => 'purge-test-'.Str::random(8),
        'first_captured_at' => $old, 'last_seen_at' => $old,
    ]);
    ageRow($oldTx, $old);

    $recentTx = RoadQueueHighElapsedTransaction::create([
        'container' => 'TEST0000002', 'bat_nbr' => 'purge-test-'.Str::random(8),
        'first_captured_at' => $recent, 'last_seen_at' => $recent,
    ]);
    ageRow($recentTx, $recent);

    $oldEcdTx = RoadQueueEcdHighElapsedTransaction::create([
        'container' => '', 'bat_nbr' => 'purge-test-'.Str::random(8),
        'first_captured_at' => $old, 'last_seen_at' => $old,
    ]);
    ageRow($oldEcdTx, $old);

    $recentEcdTx = RoadQueueEcdHighElapsedTransaction::create([
        'container' => '', 'bat_nbr' => 'purge-test-'.Str::random(8),
        'first_captured_at' => $recent, 'last_seen_at' => $recent,
    ]);
    ageRow($recentEcdTx, $recent);

    $this->artisan('operations:purge-history', ['--months' => 6])->assertSuccessful();

    expect(RoadQueueTatHistory::find($oldTat->id))->toBeNull();
    expect(RoadQueueTatHistory::find($recentTat->id))->not->toBeNull();

    expect(RoadQueueEcdTatHistory::find($oldEcdTat->id))->toBeNull();
    expect(RoadQueueEcdTatHistory::find($recentEcdTat->id))->not->toBeNull();

    expect(RoadQueueHighElapsedTransaction::find($oldTx->id))->toBeNull();
    expect(RoadQueueHighElapsedTransaction::find($recentTx->id))->not->toBeNull();

    expect(RoadQueueEcdHighElapsedTransaction::find($oldEcdTx->id))->toBeNull();
    expect(RoadQueueEcdHighElapsedTransaction::find($recentEcdTx->id))->not->toBeNull();
});
