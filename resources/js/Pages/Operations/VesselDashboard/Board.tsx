import AppLayout from '@/Layouts/AppLayout';
import ScheduleCard from '@/Components/ScheduleCard';
import VesselCard from '@/Components/VesselCard';
import VesselHourDetailModal from '@/Components/VesselHourDetailModal';
import { SharedProps } from '@/types';
import { usePage } from '@inertiajs/react';
import { ArrowDownUp, CalendarClock, Ship } from 'lucide-react';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { DashboardDataResponse, VesselSchedule, VesselVisit } from './types';

const REFRESH_INTERVAL = 60;
const SLIDE_INTERVAL = 30;
const DRILLDOWN_AUTO_RESUME = 60;
const MAX_GRID_COLUMNS = 5;
const MAX_GRID_ROWS = 4;
// Beyond this many entries, the fit-mode grid (below) can no longer shrink
// cards to fit without scrolling - auto-scroll becomes mandatory rather
// than optional past this point (see the `effectiveAutoScroll` derivation
// in the component), since nobody at an unattended kiosk can operate a
// static scrollbar.
const SCHEDULE_GRID_CAPACITY = MAX_GRID_COLUMNS * MAX_GRID_ROWS;

type ViewMode = 'vessels' | 'schedule';

// Near-square columns/rows computed purely from the entry count (no pixel
// measurement - matches this module's existing fixed-sizing precedent, see
// VesselBarChart.tsx's own comment on the same point) so the schedule grid
// always exactly fills the available area with no scrollbar for any
// realistic count - this is a kiosk/TV board, nobody can scroll it. Capped
// at MAX_GRID_COLUMNS x MAX_GRID_ROWS; beyond that, extra entries fall into
// an auto-generated row sized by content instead of shrinking indefinitely,
// which naturally re-enables scrolling as a graceful fallback.
function scheduleGridDims(total: number) {
    const columns = Math.min(MAX_GRID_COLUMNS, Math.max(1, Math.ceil(Math.sqrt(total))));
    const rows = Math.min(MAX_GRID_ROWS, Math.max(1, Math.ceil(total / columns)));
    return { columns, rows };
}

interface Drilldown {
    obIbId: string;
    vesselName: string;
    hourBucket: string;
    hourLabel: number;
    cranes: string[];
}

function WaveLoader({ progressPct, fetching }: { progressPct: number; fetching: boolean }) {
    const waveDuration = fetching ? '1.2s' : '3s';
    return (
        <div style={{ position: 'relative', height: 44, overflow: 'hidden', background: '#0a0e17' }}>
            <style>{`
                @keyframes wave-flow {
                    0%   { transform: translateX(0); }
                    100% { transform: translateX(-400px); }
                }
                @keyframes boat-bob {
                    0%, 100% { transform: translateY(0px) rotate(-1.5deg); }
                    50%       { transform: translateY(-5px) rotate(1.5deg); }
                }
                @keyframes slide-in-left {
                    from { transform: translateX(60px); opacity: 0; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
                @keyframes slide-in-right {
                    from { transform: translateX(-60px); opacity: 0; }
                    to   { transform: translateX(0);     opacity: 1; }
                }
                .wave-anim       { animation: wave-flow var(--wave-dur, 3s) linear infinite; }
                .boat-bob        { animation: boat-bob 2s ease-in-out infinite; }
                .slide-in-left   { animation: slide-in-left  350ms ease-out both; }
                .slide-in-right  { animation: slide-in-right 350ms ease-out both; }
            `}</style>

            {/* Wave SVG */}
            <svg width="100%" height="100%" viewBox="0 0 1440 44" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
                {/* Water body */}
                <rect x="0" y="28" width="1440" height="16" fill="rgba(6,78,115,0.25)" />

                {/* Seamless animated wave — 1840px wide so the -400px shift loops cleanly */}
                <g className="wave-anim" style={{ '--wave-dur': waveDuration } as React.CSSProperties}>
                    {/* Back wave — darker fill */}
                    <path
                        d="M0,30 C100,20 200,38 400,30 C600,22 700,38 900,30
                           C1100,22 1200,38 1400,30 C1600,22 1700,38 1840,30
                           L1840,44 L0,44 Z"
                        fill="rgba(6,78,115,0.35)"
                    />
                    {/* Front wave — cyan stroke */}
                    <path
                        d="M0,33 C120,24 220,42 440,33 C660,24 760,42 980,33
                           C1200,24 1300,42 1520,33 C1680,24 1760,42 1840,33"
                        fill="none"
                        stroke="rgba(34,211,238,0.45)"
                        strokeWidth="1.5"
                    />
                    {/* Highlight ripple */}
                    <path
                        d="M0,28 C80,22 160,34 320,28 C480,22 560,34 720,28
                           C880,22 960,34 1120,28 C1280,22 1360,34 1520,28
                           C1680,22 1760,34 1840,28"
                        fill="none"
                        stroke="rgba(103,232,249,0.2)"
                        strokeWidth="1"
                    />
                </g>

                {/* Thin cyan progress accent at very bottom */}
                <rect x="0" y="42" width={`${progressPct}%`} height="2" fill="rgba(34,211,238,0.7)" rx="1" />
            </svg>

            {/* Vessel — sails left→right with progressPct */}
            <div
                className="boat-bob"
                style={{
                    position: 'absolute',
                    top: 4,
                    left: `calc(${progressPct}% - 22px)`,
                    transition: 'left 1s linear',
                    pointerEvents: 'none',
                }}
            >
                <svg width="44" height="30" viewBox="0 0 44 30">
                    {/* Hull */}
                    <path d="M4,20 L40,20 L35,27 L9,27 Z" fill="#475569" />
                    {/* Cabin */}
                    <rect x="12" y="13" width="15" height="8" fill="#334155" rx="1.5" />
                    {/* Bridge window */}
                    <rect x="14" y="15" width="4" height="3" fill="rgba(34,211,238,0.5)" rx="0.5" />
                    {/* Chimney */}
                    <rect x="24" y="9" width="4" height="5" fill="#1e293b" rx="1" />
                    {/* Smoke puff */}
                    <circle cx="26" cy="7" r="2.5" fill="rgba(148,163,184,0.35)" />
                    <circle cx="29" cy="5" r="1.8" fill="rgba(148,163,184,0.2)" />
                    {/* Mast */}
                    <line x1="17" y1="3" x2="17" y2="13" stroke="#64748b" strokeWidth="1.2" />
                    {/* Flag */}
                    <path d="M17,3 L24,6 L17,9 Z" fill="rgba(34,211,238,0.7)" />
                    {/* Waterline shimmer */}
                    <path d="M6,23 Q16,21 22,23 Q30,25 38,23" fill="none" stroke="rgba(34,211,238,0.3)" strokeWidth="1" />
                </svg>
            </div>
        </div>
    );
}

function FullscreenButton({ isFullscreen, onToggle }: { isFullscreen: boolean; onToggle: () => void }) {
    return (
        <button
            onClick={onToggle}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-300 transition-colors hover:border-slate-500 hover:text-white sm:px-3 sm:py-2 sm:text-sm"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
            {isFullscreen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
                    />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
                    />
                </svg>
            )}
            <span className="hidden sm:inline">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
        </button>
    );
}

function ViewToggleButton({ viewMode, onToggle }: { viewMode: ViewMode; onToggle: () => void }) {
    return (
        <button
            onClick={onToggle}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-slate-300 transition-colors hover:border-slate-500 hover:text-white sm:px-3 sm:py-2 sm:text-sm"
            title={viewMode === 'vessels' ? 'Switch to Schedule view' : 'Switch to Vessel view'}
        >
            {viewMode === 'vessels' ? <CalendarClock className="h-4 w-4" /> : <Ship className="h-4 w-4" />}
            <span className="hidden sm:inline">{viewMode === 'vessels' ? 'Schedule View' : 'Vessel View'}</span>
        </button>
    );
}

// `active` is the effective on/off state (manual OR forced-by-overflow);
// `forced` disables the click - turning it off wouldn't be honored anyway
// once entries exceed SCHEDULE_GRID_CAPACITY, so the button reflects that
// instead of pretending it's a normal toggle in that state.
function AutoScrollToggleButton({ active, forced, onToggle }: { active: boolean; forced: boolean; onToggle: () => void }) {
    return (
        <button
            onClick={forced ? undefined : onToggle}
            disabled={forced}
            className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs transition-colors sm:px-3 sm:py-2 sm:text-sm ${
                active
                    ? 'border-cyan-500 bg-cyan-900/40 text-cyan-300 hover:border-cyan-400'
                    : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500 hover:text-white'
            } ${forced ? 'cursor-not-allowed' : ''}`}
            title={forced ? 'Auto-scroll is required - too many entries to fit on screen' : active ? 'Turn off auto-scroll' : 'Turn on auto-scroll'}
        >
            <ArrowDownUp className="h-4 w-4" />
            <span className="hidden sm:inline">
                Auto-Scroll: {active ? 'On' : 'Off'}
                {forced ? ' (Required)' : ''}
            </span>
        </button>
    );
}

export default function VesselDashboardBoard() {
    const { auth } = usePage<SharedProps>().props;

    const [vessels, setVessels] = useState<VesselVisit[]>([]);
    const [schedules, setSchedules] = useState<VesselSchedule[]>([]);
    const [viewMode, setViewMode] = useState<ViewMode>('vessels');
    const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
    const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
    const [fetching, setFetching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeIdx, setActiveIdx] = useState(0);
    const [slideDir, setSlideDir] = useState<'left' | 'right'>('left');
    const [animating, setAnimating] = useState(false);
    const [slideCountdown, setSlideCountdown] = useState(SLIDE_INTERVAL);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [drilldown, setDrilldown] = useState<Drilldown | null>(null);
    const [autoScroll, setAutoScroll] = useState(false);
    const activeIdxRef = useRef(0);
    const vesselsRef = useRef<VesselVisit[]>([]);
    const viewModeRef = useRef<ViewMode>('vessels');
    const scheduleScrollRef = useRef<HTMLDivElement | null>(null);
    // Starts true so the very first fetch (0 vessels before any data has
    // loaded) is treated as "already empty" rather than a 0→0 transition -
    // see the empty-state entry check in fetchData below.
    const prevVesselsEmptyRef = useRef(true);
    const slideTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
    const slideTickRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
    const autoResumeRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Departed schedules are history (see Management), not shown on the
    // live board. On-dock ones stay visible (with their own badge/color in
    // ScheduleCard) but are excluded from the green ETB-fade ranking below -
    // that fade means "how soon is this upcoming," which no longer applies
    // once a vessel is actually on dock.
    const visibleSchedules = schedules.filter((s) => s.status !== 'departed');
    const scheduledOnly = visibleSchedules.filter((s) => s.status === 'scheduled');

    // Auto-scroll is either the user's manual choice, or mandatory once
    // there are more entries than the fit-mode grid can shrink to fit
    // (SCHEDULE_GRID_CAPACITY) - see AutoScrollToggleButton for how the
    // header button reflects the forced case.
    const scrollForced = visibleSchedules.length > SCHEDULE_GRID_CAPACITY;
    const effectiveAutoScroll = autoScroll || scrollForced;

    const goTo = useCallback((idx: number, dir: 'left' | 'right' = 'left') => {
        setSlideDir(dir);
        setAnimating(true);
        setTimeout(() => {
            activeIdxRef.current = idx;
            setActiveIdx(idx);
            setAnimating(false);
        }, 350);
    }, []);

    const startSlideTimer = useCallback(() => {
        clearInterval(slideTimerRef.current);
        clearInterval(slideTickRef.current);
        setSlideCountdown(SLIDE_INTERVAL);
        slideTimerRef.current = setInterval(() => {
            // Schedule view shows every entry at once (a grid, not a
            // slideshow) - only vessels rotate through activeIdx.
            if (viewModeRef.current !== 'vessels') return;
            const total = vesselsRef.current.length;
            if (total <= 1) return;
            const next = (activeIdxRef.current + 1) % total;
            goTo(next, 'left');
        }, SLIDE_INTERVAL * 1000);
        slideTickRef.current = setInterval(() => {
            setSlideCountdown((prev) => (prev <= 1 ? SLIDE_INTERVAL : prev - 1));
        }, 1000);
    }, [goTo]);

    // Switches which list the slideshow shows (vessels vs. schedule) -
    // resets to the first entry and restarts the slide timer/countdown
    // against the newly-active list's length. Used both by the manual
    // toggle button and by fetchData's auto-switch below.
    const switchView = useCallback(
        (mode: ViewMode) => {
            viewModeRef.current = mode;
            setViewMode(mode);
            activeIdxRef.current = 0;
            setActiveIdx(0);
            startSlideTimer();
        },
        [startSlideTimer],
    );

    const fetchData = useCallback(async () => {
        setFetching(true);
        setError(null);
        try {
            const res = await fetch('/operations/vessel-dashboard/data');
            const json: DashboardDataResponse = await res.json();
            const list = json.vessels || [];
            const scheduleList = json.schedules || [];
            vesselsRef.current = list;
            setVessels(list);
            setSchedules(scheduleList);

            const wasEmpty = prevVesselsEmptyRef.current;
            const isEmpty = list.length === 0;
            prevVesselsEmptyRef.current = isEmpty;

            if (isEmpty && viewModeRef.current === 'vessels') {
                // No active vessels - default to the schedule view. Guarded
                // on viewMode so this doesn't re-trigger (and reset the
                // schedule slideshow's position) on every poll while
                // already showing schedules.
                switchView('schedule');
            } else if (!isEmpty && wasEmpty && viewModeRef.current === 'schedule') {
                // A vessel just arrived while the board was on schedule view
                // (whichever way it got there) - never keep showing a stale
                // schedule once live data exists again.
                switchView('vessels');
            } else if (viewModeRef.current === 'vessels') {
                // Vessel count may have changed without an empty/non-empty
                // transition - keep activeIdx in bounds. Schedules render as
                // a grid (every entry at once), so activeIdx is irrelevant
                // to them and needs no equivalent reclamp.
                setActiveIdx((prev) => {
                    const clamped = Math.min(prev, Math.max(0, list.length - 1));
                    activeIdxRef.current = clamped;
                    return clamped;
                });
            }

            setFetchedAt(new Date());
        } catch {
            setError('Failed to fetch data. Retrying next cycle.');
        } finally {
            setFetching(false);
        }
    }, [switchView]);

    useEffect(() => {
        startSlideTimer();
        return () => {
            clearInterval(slideTimerRef.current);
            clearInterval(slideTickRef.current);
        };
    }, [startSlideTimer]);

    const openDrilldown = useCallback(
        (hourBucket: string, hourLabel: number, cranes: string[]) => {
            const vessel = vesselsRef.current[activeIdxRef.current];
            if (!vessel) return;

            clearInterval(slideTimerRef.current);
            clearInterval(slideTickRef.current);
            clearTimeout(autoResumeRef.current);

            setDrilldown({ obIbId: vessel.ob_ib_id, vesselName: vessel.vessel_name, hourBucket, hourLabel, cranes });

            autoResumeRef.current = setTimeout(() => {
                setDrilldown(null);
                startSlideTimer();
            }, DRILLDOWN_AUTO_RESUME * 1000);
        },
        [startSlideTimer],
    );

    const closeDrilldown = useCallback(() => {
        clearTimeout(autoResumeRef.current);
        setDrilldown(null);
        startSlideTimer();
    }, [startSlideTimer]);

    useEffect(() => {
        fetchData();

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    fetchData();
                    return REFRESH_INTERVAL;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [fetchData]);

    useEffect(() => {
        const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    // Drives the schedule grid's auto-scroll mode - a smooth, continuous
    // scrollTop nudge each frame rather than a declarative CSS @keyframes
    // animation (like WaveLoader's), since the scroll distance depends on
    // the container's actual content height, which varies with the entry
    // count and isn't known up front. Sweeps down to the bottom, reverses,
    // sweeps back up to the top, and repeats. Position is tracked in `pos`
    // (a plain JS number, full float precision) rather than by reading
    // el.scrollTop back each frame - the DOM rounds scrollTop to a whole
    // pixel on write, so a sub-1px SPEED added to a *read-back* value never
    // accumulates (it rounds straight back down to the same integer every
    // frame) and the element appears frozen even though the loop is running.
    useEffect(() => {
        if (!effectiveAutoScroll || viewMode !== 'schedule') return;

        const el = scheduleScrollRef.current;
        if (!el) return;

        let frame: number;
        let direction: 1 | -1 = 1;
        let pos = el.scrollTop;
        const SPEED = 0.25; // px/frame - slower than the original one-way loop's 0.6

        const step = () => {
            const maxScroll = el.scrollHeight - el.clientHeight;
            if (maxScroll > 0) {
                pos += SPEED * direction;
                if (pos >= maxScroll) {
                    pos = maxScroll;
                    direction = -1;
                } else if (pos <= 0) {
                    pos = 0;
                    direction = 1;
                }
                el.scrollTop = pos;
            }
            frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);

        return () => cancelAnimationFrame(frame);
    }, [effectiveAutoScroll, viewMode]);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const toggleView = () => {
        const next: ViewMode = viewModeRef.current === 'vessels' ? 'schedule' : 'vessels';
        switchView(next);
        if (next === 'vessels') {
            // Manually switching back to Vessels should be as up-to-date as
            // possible rather than waiting out the rest of the 60s countdown.
            fetchData();
        }
    };

    const progressPct = ((REFRESH_INTERVAL - countdown) / REFRESH_INTERVAL) * 100;

    const showSidebar = auth.user && !isFullscreen;

    // Standalone kiosk mode floats this as a framed "TV panel" (padded,
    // rounded, bordered) over a darker page background. Embedded in
    // AppLayout it should instead fill the content area directly - no
    // padding, no border, no page-vs-panel background split - so pass
    // fullBleed to AppLayout (removes <main>'s own p-4/p-6) and drop the
    // framing here too, rather than floating a padded card inside an
    // already-flush content area.
    const panel: ReactNode = (
        <div
            className={`flex h-full w-full flex-col overflow-hidden ${showSidebar ? '' : 'rounded-xl border border-slate-700/60'}`}
            style={{ backgroundColor: '#0a0e17', color: '#e2e8f0' }}
        >
            {/* Header */}
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/50 px-2 py-1.5 sm:px-4 lg:px-6">
                <div>
                    <h1 className="text-sm leading-none font-bold tracking-tight text-cyan-400 uppercase sm:text-lg lg:text-xl">Vessel Operations</h1>
                    <p className="hidden text-xs text-slate-400 sm:block">Live Port Dashboard</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {fetchedAt && <p className="hidden text-xs text-slate-500 sm:block">Updated {fetchedAt.toLocaleTimeString()}</p>}
                    <ViewToggleButton viewMode={viewMode} onToggle={toggleView} />
                    {viewMode === 'schedule' && (
                        <AutoScrollToggleButton active={effectiveAutoScroll} forced={scrollForced} onToggle={() => setAutoScroll((v) => !v)} />
                    )}
                    <FullscreenButton isFullscreen={isFullscreen} onToggle={toggleFullscreen} />

                    {/* Countdown badge */}
                    <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 sm:px-3">
                        {fetching ? (
                            <>
                                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
                                <span className="font-mono text-xs text-cyan-400">Fetching…</span>
                            </>
                        ) : (
                            <>
                                <span className="inline-block h-2 w-2 rounded-full bg-slate-500" />
                                <span className="font-mono text-xs text-slate-300">
                                    Next refresh in <span className="font-bold text-cyan-400">{countdown}s</span>
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Wave loader */}
            <WaveLoader progressPct={progressPct} fetching={fetching} />

            {/* Error banner */}
            {error && (
                <div className="mx-2 mt-3 rounded-lg border border-red-700 bg-red-900/40 px-4 py-2 text-sm text-red-400 sm:mx-4 lg:mx-6">{error}</div>
            )}

            {/* Vessel/schedule cards — full-screen slideshow */}
            <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-3">
                {viewMode === 'schedule' ? (
                    visibleSchedules.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center gap-6">
                            <h2 className="text-2xl font-extrabold tracking-widest text-slate-500 uppercase sm:text-3xl lg:text-5xl">
                                No Scheduled Vessels
                            </h2>
                            <p className="text-base tracking-wide text-slate-500 sm:text-lg lg:text-2xl">
                                Add an upcoming vessel from the Management page.
                            </p>
                        </div>
                    ) : effectiveAutoScroll ? (
                        // Auto-scroll mode - either the user's manual choice, or forced once
                        // entries exceed SCHEDULE_GRID_CAPACITY (see AutoScrollToggleButton).
                        // Cards render at a fixed comfortable size rather than shrinking to
                        // fit, and the container is left free to overflow - the whole point
                        // is scrolling through it. The scrollTop-nudging effect above drives
                        // the actual motion; the native scrollbar is hidden here since the
                        // motion is programmatic,
                        // not user-driven. Row height is a fixed 480px, not content-driven
                        // (`auto`) - combining CSS Grid auto-track-sizing with this card's
                        // @container/cqw text scaling under-measured the actual content
                        // height, so rows came out too short and the LOA/Est. Moves block
                        // spilled downward into the next row - fixed height (generous enough
                        // for the widest 640px column, where cqw text is biggest) plus
                        // ScheduleCard's own overflow-hidden sidesteps that entirely.
                        <>
                            <style>{`.schedule-scroll-hide::-webkit-scrollbar{display:none}.schedule-scroll-hide{scrollbar-width:none;-ms-overflow-style:none;}`}</style>
                            <div
                                ref={scheduleScrollRef}
                                className="schedule-scroll-hide grid min-h-0 flex-1 auto-rows-[480px] grid-cols-[repeat(auto-fit,minmax(360px,640px))] justify-center gap-4 overflow-y-auto"
                            >
                                {visibleSchedules.map((s, i) => (
                                    <ScheduleCard
                                        key={s.id}
                                        schedule={s}
                                        displayIndex={i + 1}
                                        rank={s.status === 'scheduled' ? scheduledOnly.findIndex((x) => x.id === s.id) : 0}
                                        total={scheduledOnly.length || 1}
                                    />
                                ))}
                            </div>
                        </>
                    ) : (
                        // All upcoming/on-dock vessels shown at once (not a slideshow,
                        // unlike the live vessel view below), in a fixed columns x rows grid
                        // sized to the entry count (scheduleGridDims) - every card gets an
                        // equal 1fr share of the real available area, so it always fills the
                        // content area with no scrollbar rather than however many columns
                        // happen to fit at a fixed per-card pixel size. gridAutoRows is the
                        // fallback for counts beyond the cap (see scheduleGridDims).
                        (() => {
                            const { columns, rows } = scheduleGridDims(visibleSchedules.length);
                            return (
                                <div
                                    className="grid min-h-0 flex-1 gap-4 overflow-y-auto"
                                    style={{
                                        gridTemplateColumns: `repeat(${columns}, 1fr)`,
                                        gridTemplateRows: `repeat(${rows}, 1fr)`,
                                        gridAutoRows: 'minmax(200px, auto)',
                                    }}
                                >
                                    {visibleSchedules.map((s, i) => (
                                        <ScheduleCard
                                            key={s.id}
                                            schedule={s}
                                            displayIndex={i + 1}
                                            rank={s.status === 'scheduled' ? scheduledOnly.findIndex((x) => x.id === s.id) : 0}
                                            total={scheduledOnly.length || 1}
                                        />
                                    ))}
                                </div>
                            );
                        })()
                    )
                ) : vessels.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center gap-6">
                        <h2 className="text-2xl font-extrabold tracking-widest text-slate-500 uppercase sm:text-3xl lg:text-5xl">
                            No Active Vessel Visits
                        </h2>
                        <div className="flex items-center gap-3">
                            <span className="h-4 w-4 animate-pulse rounded-full bg-cyan-500" />
                            <p className="text-base tracking-wide text-slate-500 sm:text-lg lg:text-2xl">
                                {fetching ? 'Checking for vessels…' : 'Monitoring for incoming vessels…'}
                            </p>
                        </div>
                        {fetchedAt && <p className="text-sm text-slate-600 lg:text-lg">Last checked: {fetchedAt.toLocaleTimeString()}</p>}
                    </div>
                ) : (
                    <>
                        {/* Single full-height vessel card with slide animation */}
                        <div
                            key={activeIdx}
                            className={`min-h-0 flex-1 ${!animating ? (slideDir === 'left' ? 'slide-in-left' : 'slide-in-right') : ''}`}
                            style={{ opacity: animating ? 0 : undefined }}
                        >
                            <VesselCard vessel={vessels[activeIdx]} onHourClick={openDrilldown} />
                        </div>

                        {/* Dot indicators + countdown — only when multiple vessels */}
                        {vessels.length > 1 && (
                            <div className="flex shrink-0 flex-col items-center gap-1.5 pt-2">
                                {/* Countdown progress bar */}
                                <div className="flex w-36 items-center gap-2 sm:w-48">
                                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-700">
                                        <div
                                            className="h-full rounded-full bg-cyan-500 transition-all duration-1000 ease-linear"
                                            style={{ width: `${(slideCountdown / SLIDE_INTERVAL) * 100}%` }}
                                        />
                                    </div>
                                    <span className="w-6 text-right font-mono text-xs text-slate-400">{slideCountdown}s</span>
                                </div>
                                {/* Dots */}
                                <div className="flex items-center gap-2">
                                    {vessels.map((v, i) => (
                                        <button
                                            key={v.ob_ib_id}
                                            onClick={() => {
                                                const dir = i > activeIdx ? 'left' : 'right';
                                                goTo(i, dir);
                                                startSlideTimer();
                                            }}
                                            className={`rounded-full transition-all duration-300 ${
                                                i === activeIdx ? 'h-2.5 w-6 bg-cyan-400' : 'h-2.5 w-2.5 bg-slate-600 hover:bg-slate-400'
                                            }`}
                                            title={v.vessel_name}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>

            {/* Footer */}
            <footer className="flex flex-wrap items-center gap-2 border-t border-slate-700/50 px-2 py-1 text-[10px] text-slate-500 sm:gap-3 sm:px-4 sm:text-xs lg:px-6">
                <span>Data source: {viewMode === 'vessels' ? 'N4 SPARCS' : 'Manually scheduled'}</span>
                <span>•</span>
                <span>Auto-refreshes every {REFRESH_INTERVAL}s</span>
            </footer>

            <VesselHourDetailModal
                obIbId={drilldown?.obIbId ?? null}
                vesselName={drilldown?.vesselName ?? ''}
                hourBucket={drilldown?.hourBucket ?? null}
                hourLabel={drilldown?.hourLabel ?? null}
                cranes={drilldown?.cranes ?? []}
                isOpen={drilldown !== null}
                onClose={closeDrilldown}
            />
        </div>
    );

    if (showSidebar) {
        return <AppLayout fullBleed>{panel}</AppLayout>;
    }

    return (
        <div className="h-screen w-screen overflow-hidden p-4" style={{ backgroundColor: '#060a12' }}>
            {panel}
        </div>
    );
}
