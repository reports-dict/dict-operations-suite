<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

#[Signature('operations:purge-history {--months= : Retention in months, overrides config(operations.history_retention_months)} {--dry-run : Show counts without deleting}')]
#[Description('Delete Road Queue / Road Queue (ECD) history rows (TAT + high-elapsed transactions) older than the configured retention period.')]
class PurgeOperationsHistory extends Command
{
    /**
     * One generic command shared by both modules - the purge logic itself
     * (count/delete/dry-run/log) is identical infrastructure, only the
     * model list (config('operations.history_models')) differs per module.
     */
    public function handle(): int
    {
        $months = (int) ($this->option('months') ?: config('operations.history_retention_months'));
        $dryRun = (bool) $this->option('dry-run');
        $cutoff = now()->subMonths($months)->startOfDay();

        $this->info("Cutoff date: {$cutoff->toDateTimeString()}".($dryRun ? ' [DRY RUN]' : ''));

        $totals = [];

        foreach (config('operations.history_models') as $modelClass) {
            $query = $modelClass::query()->where('created_at', '<', $cutoff);
            $table = (new $modelClass)->getTable();

            if ($dryRun) {
                $count = $query->count();
                $this->line("  {$table}: {$count} row(s) would be deleted");
                $totals[$table] = $count;

                continue;
            }

            $deleted = $query->delete();
            $this->line("  {$table}: {$deleted} row(s) deleted");
            $totals[$table] = $deleted;
        }

        Log::info('PurgeOperationsHistory completed', [
            'cutoff' => $cutoff->toDateTimeString(),
            'dry_run' => $dryRun,
            'totals' => $totals,
        ]);

        $this->info('Done.');

        return self::SUCCESS;
    }
}
