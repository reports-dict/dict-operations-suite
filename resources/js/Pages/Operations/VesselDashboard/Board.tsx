import AppLayout from '@/Layouts/AppLayout';
import VesselCard from '@/Components/VesselCard';
import { SharedProps } from '@/types';
import { usePage } from '@inertiajs/react';
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { DashboardDataResponse, VesselVisit } from './types';

const REFRESH_INTERVAL = 60;
const SLIDE_INTERVAL = 30;

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

export default function VesselDashboardBoard() {
    const { auth } = usePage<SharedProps>().props;

    const [vessels, setVessels] = useState<VesselVisit[]>([]);
    const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
    const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
    const [fetching, setFetching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeIdx, setActiveIdx] = useState(0);
    const [slideDir, setSlideDir] = useState<'left' | 'right'>('left');
    const [animating, setAnimating] = useState(false);
    const [slideCountdown, setSlideCountdown] = useState(SLIDE_INTERVAL);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const activeIdxRef = useRef(0);
    const vesselsRef = useRef<VesselVisit[]>([]);
    const slideTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
    const slideTickRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

    const fetchData = useCallback(async () => {
        setFetching(true);
        setError(null);
        try {
            const res = await fetch('/operations/vessel-dashboard/data');
            const json: DashboardDataResponse = await res.json();
            const list = json.vessels || [];
            vesselsRef.current = list;
            setVessels(list);
            setActiveIdx((prev) => {
                const clamped = Math.min(prev, Math.max(0, list.length - 1));
                activeIdxRef.current = clamped;
                return clamped;
            });
            setFetchedAt(new Date());
        } catch {
            setError('Failed to fetch data. Retrying next cycle.');
        } finally {
            setFetching(false);
        }
    }, []);

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
            const total = vesselsRef.current.length;
            if (total <= 1) return;
            const next = (activeIdxRef.current + 1) % total;
            goTo(next, 'left');
        }, SLIDE_INTERVAL * 1000);
        slideTickRef.current = setInterval(() => {
            setSlideCountdown((prev) => (prev <= 1 ? SLIDE_INTERVAL : prev - 1));
        }, 1000);
    }, [goTo]);

    useEffect(() => {
        startSlideTimer();
        return () => {
            clearInterval(slideTimerRef.current);
            clearInterval(slideTickRef.current);
        };
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

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
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

            {/* Vessel cards — full-screen slideshow */}
            <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 py-2 sm:px-4 sm:py-3 lg:px-6 lg:py-3">
                {vessels.length === 0 ? (
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
                            <VesselCard vessel={vessels[activeIdx]} />
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
                <span>Data source: N4 SPARCS</span>
                <span>•</span>
                <span>Auto-refreshes every {REFRESH_INTERVAL}s</span>
            </footer>
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
