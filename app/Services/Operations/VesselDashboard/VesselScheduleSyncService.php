<?php

namespace App\Services\Operations\VesselDashboard;

use App\Models\VesselSchedule;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Syncs vessel_schedules from sparcsn4 (VesselDashboardBoardService::
 * fetchScheduleFeed()) on every VesselDashboardDataController request - see
 * that controller for why this runs per-request instead of on a schedule.
 * Each feed row is matched to a schedule row by matched_ob_ib_id = gkey
 * first; if no row is already linked to that gkey, an existing un-linked
 * manually-entered row is absorbed by vessel_name match (exact, then fuzzy)
 * so a pre-announced vessel doesn't get a duplicate row once SPARCS
 * actually picks it up - only then is a brand new row created.
 * estimated_moves is the one field this never overwrites on an existing
 * row - it's defaulted to 0 only when a row is first created here.
 */
class VesselScheduleSyncService
{
    /**
     * Minimum similar_text() percentage for a fuzzy (non-exact) name match
     * to be accepted when absorbing a manually pre-announced row into a
     * newly-seen SPARCS gkey. Conservative on purpose - a false match here
     * clobbers a human-entered row's identity; a missed match just leaves a
     * harmless duplicate for staff to notice and delete manually.
     */
    private const FUZZY_MATCH_THRESHOLD = 90.0;

    /**
     * argo_cv.phase, with SPARCS's numeric prefix already stripped by the
     * feed query's STUFF(...) - only ever INBOUND/ARRIVED/WORKING given the
     * feed's WHERE clause. departed isn't in this map: it's inferred by a
     * previously-linked gkey no longer appearing in a run's results at all
     * (see markDeparted()).
     */
    private const PHASE_STATUS_MAP = [
        'INBOUND' => 'scheduled',
        'ARRIVED' => 'on_dock',
        'WORKING' => 'on_dock',
    ];

    public function __construct(
        private readonly VesselDashboardBoardService $boardService,
    ) {}

    public function sync(): void
    {
        try {
            $rows = $this->boardService->fetchScheduleFeed();
        } catch (Throwable $e) {
            Log::error('Vessel Schedule sync: failed to fetch sparcsn4 feed', ['error' => $e->getMessage()]);

            return;
        }

        $seenGkeys = [];

        foreach ($rows as $row) {
            $gkey = (string) $row->gkey;
            $seenGkeys[] = $gkey;

            try {
                $this->upsertRow($row, $gkey);
            } catch (Throwable $e) {
                // One bad row (e.g. an unexpected null) must not abort the
                // rest of the sync.
                Log::error('Vessel Schedule sync: failed to upsert row', [
                    'gkey' => $gkey,
                    'vessel_name' => $row->vessel_name ?? null,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        $this->markDeparted($seenGkeys);
    }

    private function upsertRow(object $row, string $gkey): void
    {
        $schedule = VesselSchedule::where('matched_ob_ib_id', $gkey)->first()
            ?? $this->absorbUnlinkedMatch($row->vessel_name)
            ?? new VesselSchedule(['estimated_moves' => 0]);

        // Departed is terminal, whether it got there automatically
        // (markDeparted() below, when a gkey drops out of the feed) or
        // manually (Management's "Mark Departed" action, for a vessel
        // still active in the feed) - once set, the sync must never
        // resurrect or refresh this row again, or a manual departure would
        // just get silently overwritten back to on_dock/scheduled on the
        // very next sync.
        if ($schedule->exists && $schedule->status === 'departed') {
            return;
        }

        $schedule->matched_ob_ib_id = $gkey;
        $schedule->vessel_name = $row->vessel_name;
        // NOT NULL columns with no DB default - the feed's LEFT JOINs to
        // ref_carrier_service/ref_bizunit_scoped can legitimately return
        // null (e.g. an unrecognised service/bizunit code upstream).
        $schedule->service = $row->vessel_service ?? '';
        $schedule->line_operator = $row->line_op ?? '';
        $schedule->loa_meters = $row->loa_meters;
        $schedule->berth_number = $row->berth;
        $schedule->etb = $row->eta;
        $schedule->etd = $row->etd;

        $status = self::PHASE_STATUS_MAP[$row->phase] ?? 'scheduled';
        $schedule->status = $status;

        if ($status === 'on_dock' && ! $schedule->on_dock_at) {
            $schedule->on_dock_at = now();
        }

        // estimated_moves is intentionally never assigned here on an
        // existing row - see class docblock. It's only present in the
        // ?? new VesselSchedule([...]) fallback above, for first creation.
        $schedule->save();
    }

    /**
     * Looks for an existing manually pre-announced row (matched_ob_ib_id
     * still null) whose vessel_name matches this feed row's name, so a
     * vessel someone already typed in gets claimed rather than duplicated
     * once SPARCS actually shows it. Exact (case-insensitive/trimmed) match
     * first, else the best similar_text() match at or above
     * FUZZY_MATCH_THRESHOLD - same logic the old controller-level
     * findMatch() used, now scoped to unlinked rows only.
     */
    private function absorbUnlinkedMatch(?string $vesselName): ?VesselSchedule
    {
        if (! $vesselName) {
            return null;
        }

        $needle = mb_strtolower(trim($vesselName));
        $candidates = VesselSchedule::whereNull('matched_ob_ib_id')->get();

        foreach ($candidates as $candidate) {
            if (mb_strtolower(trim($candidate->vessel_name)) === $needle) {
                return $candidate;
            }
        }

        $best = null;
        $bestPercent = 0.0;

        foreach ($candidates as $candidate) {
            similar_text($needle, mb_strtolower(trim($candidate->vessel_name)), $percent);
            if ($percent > $bestPercent) {
                $bestPercent = $percent;
                $best = $candidate;
            }
        }

        return $bestPercent >= self::FUZZY_MATCH_THRESHOLD ? $best : null;
    }

    /**
     * A previously-linked schedule whose gkey isn't in this run's feed has
     * left the feed's WHERE clause's phase set (INBOUND/ARRIVED/WORKING)
     * entirely - the only way that happens is departure (or cancellation),
     * so mark it departed. Guarded against an empty $seenGkeys: a feed
     * returning zero rows almost certainly means a transient sparcsn4
     * issue, not "every linked vessel departed simultaneously" - without
     * this guard, whereNotIn(...) against an empty array matches everything
     * and would mass-depart the whole table.
     */
    private function markDeparted(array $seenGkeys): void
    {
        if (empty($seenGkeys)) {
            return;
        }

        VesselSchedule::whereNotNull('matched_ob_ib_id')
            ->whereNotIn('matched_ob_ib_id', $seenGkeys)
            ->where('status', '!=', 'departed')
            ->update(['status' => 'departed', 'departed_at' => now()]);
    }
}
