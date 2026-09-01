import { CalendarClock, Ship } from 'lucide-react';
import { VesselSchedule } from '@/Pages/Operations/VesselDashboard/types';

// Splits into a compact date + time pair rather than one long
// toLocaleString() string - the combined form wrapped awkwardly across
// 2-3 lines at card width and broke the layout. Year is only included when
// it differs from the current year, since every near-term schedule entry
// otherwise repeats the same (redundant) year six times across a card.
function splitDateTime(dt: string): { date: string; time: string } {
    const d = new Date(dt);
    const includeYear = d.getFullYear() !== new Date().getFullYear();
    return {
        date: d.toLocaleDateString([], { month: 'short', day: '2-digit', ...(includeYear ? { year: 'numeric' } : {}) }),
        time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
}

// @container/cqw fluid sizing (same convention VesselCard uses) so text
// tracks this card's own rendered width, whether it's alone and full-width
// in the schedule grid or one of several narrower cells. Coefficient =
// (max_rem-min_rem)*1600/target_px, target_px=620 (~this card's actual
// width in the now-common 3-column case, since the schedule feed is capped
// at 3 entries). A previous pass used target_px=750 *and* much bigger max
// ceilings at the same time - the two changes compounded and badly
// overshot (vessel names wrapping and overflowing the card). This pass
// keeps the ceilings modest and only recalibrates the target width, so
// ~620px reaches close to (not far past) each max.
const metaLabel = 'text-[clamp(0.7rem,0.7rem_+_0.5cqw,0.9rem)] tracking-widest text-emerald-200/60 uppercase';
const metaValue = 'text-[clamp(0.8rem,0.8rem_+_0.8cqw,1.1rem)] font-bold text-emerald-50';
const eventLabel = 'text-[clamp(0.7rem,0.7rem_+_0.65cqw,0.95rem)] font-semibold tracking-widest text-emerald-200/60 uppercase';
const eventTime = 'mt-1 text-[clamp(1.25rem,1.25rem_+_4.5cqw,3rem)] font-extrabold text-white';
const eventDate = 'text-[clamp(1.25rem,1.25rem_+_4.5cqw,3rem)] font-semibold text-emerald-100/80';
const statLabel = 'text-[clamp(0.65rem,0.65rem_+_0.5cqw,0.85rem)] tracking-widest text-emerald-200/60 uppercase';
const statValue = 'mt-1 text-[clamp(1rem,1rem_+_1.9cqw,1.75rem)] font-extrabold text-white';

function Divider() {
    return <div className="my-4 h-px w-full shrink-0 bg-emerald-400/20 @sm:my-6" />;
}

interface ScheduleCardProps {
    schedule: VesselSchedule | undefined;
    // Position in the already ETB-sorted-ascending list (0 = soonest) and
    // the list's total length - used to fade the card's green background
    // from strongest (soonest upcoming) to faintest (furthest out).
    rank?: number;
    total?: number;
    // 1-based position among ALL visible cards (scheduled + on-dock), shown
    // as a corner badge - independent of rank/total above, which only
    // covers scheduled entries for the fade.
    displayIndex: number;
}

const MIN_INTENSITY = 0.25;

export default function ScheduleCard({ schedule, rank = 0, total = 1, displayIndex }: ScheduleCardProps) {
    if (!schedule) return null;

    const isOnDock = schedule.status === 'on_dock';

    const intensity = total > 1 ? Math.max(MIN_INTENSITY, 1 - (rank / (total - 1)) * (1 - MIN_INTENSITY)) : 1;
    // Scheduled: emerald-ish green, alpha-scaled by ETB-fade intensity, over
    // the same near-black base the rest of the board uses - keeps text
    // contrast solid even at the faintest end rather than fading toward
    // invisible/gray. On-dock: a fixed cyan tint instead - it's no longer
    // "how soon," so it doesn't participate in that fade at all.
    const cardStyle = isOnDock
        ? { backgroundColor: 'rgba(8, 74, 92, 0.55)', borderColor: 'rgba(34, 211, 238, 0.55)' }
        : {
              backgroundColor: `rgba(16, 90, 65, ${0.28 + intensity * 0.42})`,
              borderColor: `rgba(16, 185, 129, ${0.25 + intensity * 0.45})`,
          };

    const etb = splitDateTime(schedule.etb);
    const etd = splitDateTime(schedule.etd);

    return (
        <div
            className="@container relative flex h-full w-full flex-col overflow-hidden rounded-xl border p-6 @sm:p-8"
            style={cardStyle}
        >
            {/* Sort-order badge - 1-based position among all visible cards,
                corner-placed so it doesn't collide with the centered
                Scheduled/On Dock pill below. */}
            <div className="absolute top-2 left-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/30 bg-black/55 text-[clamp(1rem,1rem_+_1.2cqw,2.75rem)] font-extrabold text-white @sm:top-3 @sm:left-3 @sm:h-14 @sm:w-14">
                {displayIndex}
            </div>

            {/* Identity - badge, vessel name, then service/operator as an
                inline meta line (same SVC/OPR convention VesselCard's header
                uses) rather than as two more boxed fields down in the grid. */}
            <div className="flex shrink-0 flex-col items-center text-center">
                {isOnDock ? (
                    <div className="mb-3 flex items-center gap-2 rounded-full border border-cyan-400/50 bg-cyan-900/30 px-3 py-1 @sm:px-4 @sm:py-1.5">
                        <Ship className="h-4 w-4 text-cyan-300 @sm:h-5 @sm:w-5" />
                        <span className="text-xs font-bold tracking-widest text-cyan-300 uppercase @sm:text-sm">On Dock</span>
                    </div>
                ) : (
                    <div className="mb-3 flex items-center gap-2 rounded-full border border-amber-500/50 bg-amber-900/20 px-3 py-1 @sm:px-4 @sm:py-1.5">
                        <CalendarClock className="h-4 w-4 text-amber-400 @sm:h-5 @sm:w-5" />
                        <span className="text-xs font-bold tracking-widest text-amber-400 uppercase @sm:text-sm">Scheduled</span>
                    </div>
                )}
                <h2 className="text-[clamp(1.125rem,1.125rem_+_4.8cqw,3rem)] font-extrabold tracking-wide text-white">
                    {schedule.vessel_name}
                </h2>
                <div className="mt-1.5 flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1">
                    <span>
                        <span className={metaLabel}>SVC </span>
                        <span className={metaValue}>{schedule.service}</span>
                    </span>
                    <span>
                        <span className={metaLabel}>OPR </span>
                        <span className={metaValue}>{schedule.line_operator}</span>
                    </span>
                </div>
            </div>

            <Divider />

            {/* ETB/ETD - the primary "when" info, given the most visual
                weight and a stable date+time split instead of one long
                string that wrapped unpredictably. */}
            <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                    <p className={eventLabel}>ETB</p>
                    <p className={eventTime}>{etb.time}</p>
                    <p className={eventDate}>{etb.date}</p>
                </div>
                <div>
                    <p className={eventLabel}>ETD</p>
                    <p className={eventTime}>{etd.time}</p>
                    <p className={eventDate}>{etd.date}</p>
                </div>
            </div>

            <Divider />

            {/* LOA/Berth/Est. Moves - secondary vessel specs */}
            <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                    <p className={statLabel}>LOA</p>
                    <p className={statValue}>{schedule.loa_meters}m</p>
                </div>
                <div>
                    <p className={statLabel}>Berth</p>
                    <p className={statValue}>{schedule.berth_number || '—'}</p>
                </div>
                <div>
                    <p className={statLabel}>Est. Moves</p>
                    <p className={statValue}>{schedule.estimated_moves}</p>
                </div>
            </div>
        </div>
    );
}
