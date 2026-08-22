import { ArrowLeftRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import ProgressBar from '@/Components/ProgressBar';
import VesselBarChart from '@/Components/VesselBarChart';
import { useNarrowViewport } from '@/hooks/useNarrowViewport';
import { VesselVisit } from '@/Pages/Operations/VesselDashboard/types';

function useElapsed(dateStr: string | null) {
    const calc = () => {
        if (!dateStr) return null;
        const ms = Date.now() - new Date(dateStr).getTime();
        if (ms < 0) return null;
        return Math.round((ms / (1000 * 60 * 60)) * 2) / 2;
    };
    const [elapsed, setElapsed] = useState<number | null>(calc);
    useEffect(() => {
        if (!dateStr) return;
        setElapsed(calc());
        const t = setInterval(() => setElapsed(calc()), 30000);
        return () => clearInterval(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateStr]);
    return elapsed;
}

function PhaseBadge({ phase }: { phase: string }) {
    const cls =
        phase === '40WORKING'
            ? 'bg-amber-900/50 text-amber-400 border border-amber-700'
            : 'bg-cyan-900/50 text-cyan-400 border border-cyan-700';
    const label = phase === '40WORKING' ? 'Working' : 'Arrived';
    return <span className={`rounded px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>;
}

const bal = (planned: number, done: number) => Math.max(0, (planned || 0) - (done || 0));

// Fluid clamp()-based sizing keyed off the stat column's own width via CSS
// container queries (cqw) - see the `@container` on the lg:w-1/2 wrapper
// around StatTable/StatCards in VesselCard below. Unlike a fixed sm:/lg:
// step scale, this keeps growing past 1024px instead of capping there,
// which matters since this board runs on TVs/monitors well above that
// width. MIN mirrors the old mobile size; MAX sits above the old lg: cap.
// cqw coefficients = 100*(target_px-min_px)/900 (900px = this column's
// real width on a 1920px-wide kiosk screen), so text is at least the old
// lg: size on a typical TV, not just barely above the old mobile size.
const cell = 'text-center text-[clamp(1rem,1rem_+_2.222cqw,3.5rem)] font-extrabold px-1 sm:px-2 align-middle';
const label =
    'text-left text-[clamp(0.75rem,0.75rem_+_2.667cqw,3.25rem)] font-bold uppercase tracking-widest px-1 sm:px-2 whitespace-nowrap align-middle';
const colHead = 'text-center text-[clamp(0.75rem,0.75rem_+_2cqw,2.5rem)] font-bold uppercase tracking-widest px-1 sm:px-2 py-0';
const groupHead =
    'text-center text-[clamp(0.75rem,0.75rem_+_2cqw,2.5rem)] font-extrabold uppercase tracking-widest px-1 sm:px-2 py-0 border-b border-slate-600/50';
const sectionRow = 'text-[clamp(0.875rem,0.875rem_+_1.778cqw,2.5rem)] font-extrabold uppercase tracking-widest px-1 sm:px-2 py-0.5';
const totalLabel = 'text-[clamp(0.75rem,0.75rem_+_1.333cqw,2rem)] font-bold tracking-widest uppercase';
const totalValue = 'text-[clamp(0.875rem,0.875rem_+_2.444cqw,3.25rem)] font-extrabold';

// Shared by StatTable (lg: and up) and StatCards (below lg) so the two
// "Total Planned / Total Done / Balance" summary rows stay in sync.
function TotalsRow({
    plannedLabel,
    plannedValue,
    doneLabel,
    doneValue,
    balanceValue,
}: {
    plannedLabel: string;
    plannedValue: number;
    doneLabel: string;
    doneValue: number;
    balanceValue: number;
}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-x-3">
            <span className={`${totalLabel} text-blue-500`}>
                {plannedLabel}: <span className={`text-blue-300 ${totalValue}`}>{plannedValue}</span>
            </span>
            <span className={`${totalLabel} text-green-600`}>
                {doneLabel}: <span className={`text-green-400 ${totalValue}`}>{doneValue}</span>
            </span>
            <span className={`${totalLabel} text-yellow-600`}>
                Balance: <span className={`text-yellow-300 ${totalValue}`}>{balanceValue}</span>
            </span>
        </div>
    );
}

function StatTable({ vessel }: { vessel: VesselVisit }) {
    return (
        <div className="h-full overflow-x-auto">
            <table className="h-full w-full min-w-[420px] border-collapse text-white">
                <thead>
                    <tr className="bg-slate-900/60">
                        <th className="px-1.5 py-0 sm:px-3" />
                        <th colSpan={2} className={`${groupHead} border-l border-slate-600/50`}>
                            20FT
                        </th>
                        <th colSpan={2} className={`${groupHead} border-l border-slate-600/50`}>
                            40FT
                        </th>
                    </tr>
                    <tr className="bg-slate-900/40">
                        <th className="px-1.5 py-0 sm:px-3" />
                        <th className={`${colHead} border-l border-slate-600/50 text-slate-300`}>FCL</th>
                        <th className={`${colHead} text-slate-300`}>MTY</th>
                        <th className={`${colHead} border-l border-slate-600/50 text-slate-300`}>FCL</th>
                        <th className={`${colHead} text-slate-300`}>MTY</th>
                    </tr>
                </thead>
                <tbody>
                    {/* DISCHARGING section */}
                    <tr className="border-t border-amber-700/40 bg-amber-900/20">
                        <td colSpan={5} className={`${sectionRow} text-amber-400`}>
                            Discharging
                        </td>
                    </tr>
                    <tr className="bg-slate-800/60">
                        <td className={`${label} text-blue-400`}>Planned</td>
                        <td className={`${cell} border-l border-slate-700/30 text-blue-300`}>{vessel.discharge_plan_fcl_20ft}</td>
                        <td className={`${cell} text-blue-300`}>{vessel.discharge_plan_mty_20ft}</td>
                        <td className={`${cell} border-l border-slate-700/30 text-blue-300`}>{vessel.discharge_plan_fcl_40ft}</td>
                        <td className={`${cell} text-blue-300`}>{vessel.discharge_plan_mty_40ft}</td>
                    </tr>
                    <tr className="bg-slate-800/40">
                        <td className={`${label} text-green-400`}>Discharged</td>
                        <td className={`${cell} border-l border-slate-700/30 text-green-300`}>{vessel.discharged_fcl_20ft}</td>
                        <td className={`${cell} text-green-300`}>{vessel.discharged_empty_20ft}</td>
                        <td className={`${cell} border-l border-slate-700/30 text-green-300`}>{vessel.discharged_fcl_40ft}</td>
                        <td className={`${cell} text-green-300`}>{vessel.discharged_empty_40ft}</td>
                    </tr>
                    <tr className="bg-slate-800/20">
                        <td className={`${label} text-yellow-400`}>Balance</td>
                        <td className={`${cell} border-l border-slate-700/30 text-yellow-300`}>
                            {bal(vessel.discharge_plan_fcl_20ft, vessel.discharged_fcl_20ft)}
                        </td>
                        <td className={`${cell} text-yellow-300`}>{bal(vessel.discharge_plan_mty_20ft, vessel.discharged_empty_20ft)}</td>
                        <td className={`${cell} border-l border-slate-700/30 text-yellow-300`}>
                            {bal(vessel.discharge_plan_fcl_40ft, vessel.discharged_fcl_40ft)}
                        </td>
                        <td className={`${cell} text-yellow-300`}>{bal(vessel.discharge_plan_mty_40ft, vessel.discharged_empty_40ft)}</td>
                    </tr>
                    <tr className="border-b border-amber-700/30 bg-amber-900/10">
                        <td colSpan={5} className="px-1 py-0.5 sm:px-2">
                            <TotalsRow
                                plannedLabel="Total Planned"
                                plannedValue={vessel.total_planned_discharge}
                                doneLabel="Total Disch"
                                doneValue={vessel.total_discharged_count}
                                balanceValue={bal(vessel.total_planned_discharge, vessel.total_discharged_count)}
                            />
                        </td>
                    </tr>

                    {/* LOADING section */}
                    <tr className="border-t-2 border-slate-600/60 bg-cyan-900/20">
                        <td colSpan={5} className={`${sectionRow} text-cyan-400`}>
                            Loading
                        </td>
                    </tr>
                    <tr className="bg-slate-800/60">
                        <td className={`${label} text-blue-400`}>Planned</td>
                        <td className={`${cell} border-l border-slate-700/30 text-blue-300`}>{vessel.load_plan_fcl_20ft}</td>
                        <td className={`${cell} text-blue-300`}>{vessel.load_plan_empty_20ft}</td>
                        <td className={`${cell} border-l border-slate-700/30 text-blue-300`}>{vessel.load_plan_fcl_40ft}</td>
                        <td className={`${cell} text-blue-300`}>{vessel.load_plan_empty_40ft}</td>
                    </tr>
                    <tr className="bg-slate-800/40">
                        <td className={`${label} text-green-400`}>Loaded</td>
                        <td className={`${cell} border-l border-slate-700/30 text-green-300`}>{vessel.loaded_fcl_20ft}</td>
                        <td className={`${cell} text-green-300`}>{vessel.loaded_empty_20ft}</td>
                        <td className={`${cell} border-l border-slate-700/30 text-green-300`}>{vessel.loaded_fcl_40ft}</td>
                        <td className={`${cell} text-green-300`}>{vessel.loaded_empty_40ft}</td>
                    </tr>
                    <tr className="bg-slate-800/20">
                        <td className={`${label} text-yellow-400`}>Balance</td>
                        <td className={`${cell} border-l border-slate-700/30 text-yellow-300`}>{bal(vessel.load_plan_fcl_20ft, vessel.loaded_fcl_20ft)}</td>
                        <td className={`${cell} text-yellow-300`}>{bal(vessel.load_plan_empty_20ft, vessel.loaded_empty_20ft)}</td>
                        <td className={`${cell} border-l border-slate-700/30 text-yellow-300`}>{bal(vessel.load_plan_fcl_40ft, vessel.loaded_fcl_40ft)}</td>
                        <td className={`${cell} text-yellow-300`}>{bal(vessel.load_plan_empty_40ft, vessel.loaded_empty_40ft)}</td>
                    </tr>
                    <tr className="border-b border-cyan-700/30 bg-cyan-900/10">
                        <td colSpan={5} className="px-1 py-0.5 sm:px-2">
                            <TotalsRow
                                plannedLabel="Total Planned"
                                plannedValue={vessel.total_planned_loading_wi}
                                doneLabel="Total Loaded"
                                doneValue={vessel.total_loaded_count}
                                balanceValue={bal(vessel.total_planned_loading_wi, vessel.total_loaded_count)}
                            />
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

// Mobile/tablet-only stand-in for StatTable (below lg) - a dense
// multi-column table is unreadable on a phone, so this reshapes the same
// figures into stacked per-section cards instead of squeezing table columns.
function StatRowCard({
    label,
    labelColor,
    valueColor,
    fcl20,
    mty20,
    fcl40,
    mty40,
}: {
    label: string;
    labelColor: string;
    valueColor: string;
    fcl20: number;
    mty20: number;
    fcl40: number;
    mty40: number;
}) {
    const values: [string, number][] = [
        ['20 FCL', fcl20],
        ['20 MTY', mty20],
        ['40 FCL', fcl40],
        ['40 MTY', mty40],
    ];

    return (
        <div className="flex items-center justify-between gap-2 rounded-md bg-slate-800/40 px-2 py-1.5">
            <span
                className={`w-16 shrink-0 text-[clamp(0.75rem,0.75rem_+_1.111cqw,1.375rem)] font-bold tracking-wide uppercase ${labelColor}`}
            >
                {label}
            </span>
            <div className="grid flex-1 grid-cols-4 gap-1 text-center">
                {values.map(([hdr, val]) => (
                    <div key={hdr}>
                        <div className="text-[clamp(0.5625rem,0.5625rem_+_0.556cqw,0.875rem)] text-slate-500 uppercase">{hdr}</div>
                        <div className={`text-[clamp(0.875rem,0.875rem_+_1.111cqw,1.5rem)] font-extrabold ${valueColor}`}>{val}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function StatCards({ vessel }: { vessel: VesselVisit }) {
    return (
        <div className="flex h-full flex-col gap-3 overflow-y-auto">
            {/* Discharging */}
            <div className="rounded-lg border border-amber-700/40 bg-amber-900/10 p-2">
                <p className="px-1 py-1 text-sm font-extrabold tracking-widest text-amber-400 uppercase">Discharging</p>
                <div className="flex flex-col gap-1.5">
                    <StatRowCard
                        label="Planned"
                        labelColor="text-blue-400"
                        valueColor="text-blue-300"
                        fcl20={vessel.discharge_plan_fcl_20ft}
                        mty20={vessel.discharge_plan_mty_20ft}
                        fcl40={vessel.discharge_plan_fcl_40ft}
                        mty40={vessel.discharge_plan_mty_40ft}
                    />
                    <StatRowCard
                        label="Discharged"
                        labelColor="text-green-400"
                        valueColor="text-green-300"
                        fcl20={vessel.discharged_fcl_20ft}
                        mty20={vessel.discharged_empty_20ft}
                        fcl40={vessel.discharged_fcl_40ft}
                        mty40={vessel.discharged_empty_40ft}
                    />
                    <StatRowCard
                        label="Balance"
                        labelColor="text-yellow-400"
                        valueColor="text-yellow-300"
                        fcl20={bal(vessel.discharge_plan_fcl_20ft, vessel.discharged_fcl_20ft)}
                        mty20={bal(vessel.discharge_plan_mty_20ft, vessel.discharged_empty_20ft)}
                        fcl40={bal(vessel.discharge_plan_fcl_40ft, vessel.discharged_fcl_40ft)}
                        mty40={bal(vessel.discharge_plan_mty_40ft, vessel.discharged_empty_40ft)}
                    />
                </div>
                <div className="mt-1.5 px-1">
                    <TotalsRow
                        plannedLabel="Total Planned"
                        plannedValue={vessel.total_planned_discharge}
                        doneLabel="Total Disch"
                        doneValue={vessel.total_discharged_count}
                        balanceValue={bal(vessel.total_planned_discharge, vessel.total_discharged_count)}
                    />
                </div>
            </div>

            {/* Loading */}
            <div className="rounded-lg border border-cyan-700/40 bg-cyan-900/10 p-2">
                <p className="px-1 py-1 text-sm font-extrabold tracking-widest text-cyan-400 uppercase">Loading</p>
                <div className="flex flex-col gap-1.5">
                    <StatRowCard
                        label="Planned"
                        labelColor="text-blue-400"
                        valueColor="text-blue-300"
                        fcl20={vessel.load_plan_fcl_20ft}
                        mty20={vessel.load_plan_empty_20ft}
                        fcl40={vessel.load_plan_fcl_40ft}
                        mty40={vessel.load_plan_empty_40ft}
                    />
                    <StatRowCard
                        label="Loaded"
                        labelColor="text-green-400"
                        valueColor="text-green-300"
                        fcl20={vessel.loaded_fcl_20ft}
                        mty20={vessel.loaded_empty_20ft}
                        fcl40={vessel.loaded_fcl_40ft}
                        mty40={vessel.loaded_empty_40ft}
                    />
                    <StatRowCard
                        label="Balance"
                        labelColor="text-yellow-400"
                        valueColor="text-yellow-300"
                        fcl20={bal(vessel.load_plan_fcl_20ft, vessel.loaded_fcl_20ft)}
                        mty20={bal(vessel.load_plan_empty_20ft, vessel.loaded_empty_20ft)}
                        fcl40={bal(vessel.load_plan_fcl_40ft, vessel.loaded_fcl_40ft)}
                        mty40={bal(vessel.load_plan_empty_40ft, vessel.loaded_empty_40ft)}
                    />
                </div>
                <div className="mt-1.5 px-1">
                    <TotalsRow
                        plannedLabel="Total Planned"
                        plannedValue={vessel.total_planned_loading_wi}
                        doneLabel="Total Loaded"
                        doneValue={vessel.total_loaded_count}
                        balanceValue={bal(vessel.total_planned_loading_wi, vessel.total_loaded_count)}
                    />
                </div>
            </div>
        </div>
    );
}

// SVC/OPR/ATA/ATD chips + progress-bar labels share this scale. Sized off
// the card's own width (@container on VesselCard's root below), since these
// span the full card rather than the half-width stat column. Coefficient =
// 100*(target_px-min_px)/1600 (1600px ~= this card's real width on a
// 1920px-wide kiosk screen).
const meta = 'text-[clamp(0.75rem,0.75rem_+_1.125cqw,2.75rem)]';

interface VesselCardProps {
    vessel: VesselVisit | undefined;
    onHourClick?: (hourBucket: string, hourLabel: number, cranes: string[]) => void;
}

export default function VesselCard({ vessel, onHourClick }: VesselCardProps) {
    const fmt = (dt: string | null) => (dt ? new Date(dt).toLocaleString() : null);
    const elapsed = useElapsed(vessel?.actual_time_of_arrival ?? null);
    const isNarrowViewport = useNarrowViewport();

    if (!vessel) return null;

    return (
        <div className="@container flex h-full flex-col rounded-xl border border-slate-700 bg-slate-800/80 p-3">
            {/* Vessel header */}
            <div className="mb-1 flex shrink-0 flex-wrap items-center gap-2">
                <h2 className="text-[clamp(1.125rem,1.125rem_+_0.75cqw,2.75rem)] font-extrabold tracking-wide text-white">
                    {vessel.vessel_name}
                </h2>
                <PhaseBadge phase={vessel.phase} />
                <div className="flex items-center gap-1">
                    <span className={`text-slate-500 ${meta} tracking-widest uppercase`}>SVC</span>
                    <span className={`text-slate-200 ${meta} font-bold`}>{vessel.service}</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className={`text-slate-500 ${meta} tracking-widest uppercase`}>OPR</span>
                    <span className={`text-slate-200 ${meta} font-bold`}>{vessel.line_op}</span>
                </div>
                <div className="ml-auto flex flex-wrap items-center gap-3">
                    {fmt(vessel.actual_time_of_arrival) && (
                        <div className="flex items-center gap-2">
                            <span className={`text-slate-500 ${meta} tracking-widest uppercase`}>ATA</span>
                            <span className={`text-slate-200 ${meta} font-bold`}>{fmt(vessel.actual_time_of_arrival)}</span>
                            {elapsed !== null && <span className={`${meta} font-mono font-extrabold text-amber-400`}>+{elapsed.toFixed(1)}h</span>}
                        </div>
                    )}
                    {fmt(vessel.actual_time_of_departure) && (
                        <div className="flex items-center gap-1">
                            <span className={`text-slate-500 ${meta} tracking-widest uppercase`}>ATD</span>
                            <span className={`text-slate-200 ${meta} font-bold`}>{fmt(vessel.actual_time_of_departure)}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Two progress bars - stacked on phones, side-by-side from sm: up */}
            <div className="mb-1 grid shrink-0 grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                    <div className="mb-0.5 flex items-center justify-between">
                        <span className={`font-semibold text-amber-400 uppercase ${meta} tracking-widest`}>Discharge</span>
                        <span className={`text-slate-300 ${meta} font-mono font-bold`}>
                            {vessel.total_discharged_count} / {vessel.total_planned_discharge}
                        </span>
                    </div>
                    <ProgressBar value={vessel.total_discharged_count} max={vessel.total_planned_discharge} colorClass="bg-amber-500" />
                </div>
                <div>
                    <div className="mb-0.5 flex items-center justify-between">
                        <span className={`font-semibold text-cyan-400 uppercase ${meta} tracking-widest`}>Loading</span>
                        <span className={`text-slate-300 ${meta} font-mono font-bold`}>
                            {vessel.total_loaded_count} / {vessel.total_planned_loading_wi}
                        </span>
                    </div>
                    <ProgressBar value={vessel.total_loaded_count} max={vessel.total_planned_loading_wi} colorClass="bg-cyan-500" />
                </div>
            </div>

            {/* Stat table/cards + chart - stacked (scrollable) on phones/tablets, side-by-side (fixed, no scroll) from lg: up */}
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto lg:flex-row lg:overflow-hidden">
                {/* Left - StatTable (dense, desktop/TV) at lg: and up, StatCards (stacked, mobile-friendly) below lg:.
                    @container here (not on the card root) since this column is only
                    half the card's width at lg: - cqw inside StatTable/StatCards/
                    TotalsRow needs to measure against this column, not the full card. */}
                <div className="@container flex min-h-0 w-full shrink-0 flex-col overflow-hidden lg:w-1/2 lg:shrink">
                    <div className="hidden h-full lg:block">
                        <StatTable vessel={vessel} />
                    </div>
                    <div className="lg:hidden">
                        <StatCards vessel={vessel} />
                    </div>
                </div>
                {/* Right - chart, full width on mobile, 50%/75%-height centered on desktop/TV */}
                <div className="flex min-h-0 w-full shrink-0 flex-col items-center justify-center lg:w-1/2 lg:shrink">
                    {isNarrowViewport && (
                        <p className="mb-1 flex shrink-0 items-center justify-center gap-1 text-[10px] text-slate-500">
                            <ArrowLeftRight className="h-3 w-3" />
                            Swipe sideways to see the full chart
                        </p>
                    )}
                    <div className={`h-64 w-full sm:h-80 lg:h-3/4 ${isNarrowViewport ? 'overflow-x-auto' : ''}`}>
                        {/* Below lg, force a per-bar minimum width so the chart
                            renders at its normal (TV-scale) size instead of
                            squishing - the container scrolls horizontally instead. */}
                        <div
                            className="h-full"
                            style={isNarrowViewport ? { minWidth: Math.max((vessel.graph?.length ?? 0) * 44, 560) } : undefined}
                        >
                            <VesselBarChart graphData={vessel.graph} vesselName={vessel.vessel_name} onBarClick={onHourClick} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
