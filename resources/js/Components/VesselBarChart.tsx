import { Bar, CartesianGrid, ComposedChart, Legend, LabelList, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { VesselGraphEntry } from '@/Pages/Operations/VesselDashboard/types';

const Y_MAX = 60;
const THRESHOLD = 20;
const GAP = 1; // 1px inset per touching edge = 2px surface gap between stacked segments

type CraneKey = 'QC1' | 'QC2' | 'QC3' | 'QC4' | 'UNKR' | 'ECIN';

// Fixed crane colors (dark-surface categorical palette hues), per crane identity.
const CRANE_COLORS: Record<CraneKey, string> = {
    QC1: '#a0522d', // brown
    QC2: '#3987e5', // blue
    QC3: '#008300', // green
    QC4: '#c2368f', // magenta/pink
    UNKR: '#e66767', // red
    ECIN: '#c98500', // yellow
};

// Stacking order (bottom to top). This is NOT the same as reading order —
// it's chosen so adjacent segments clear the color-vision-deficiency
// separation check (validated via the dataviz skill's palette validator);
// putting yellow (ECIN) next to red (UNKR) or orange (QC1) both fail that
// check, so ECIN/UNKR sit at opposite ends of the stack instead. Legend
// order below is independent and follows natural crane numbering.
const STACK_ORDER: CraneKey[] = ['ECIN', 'QC3', 'QC2', 'QC1', 'QC4', 'UNKR'];
const LEGEND_ORDER: CraneKey[] = ['QC1', 'QC2', 'QC3', 'QC4', 'UNKR', 'ECIN'];

const CRANES = STACK_ORDER.map((key) => ({ key, color: CRANE_COLORS[key] }));

interface StackSegmentProps {
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
    gapTop: boolean;
    gapBottom: boolean;
    radius?: number;
}

function StackSegment({ x, y, width, height, fill, gapTop, gapBottom, radius = 0 }: StackSegmentProps) {
    if (height <= 0) return null;

    const top = gapTop ? GAP : 0;
    const bottom = gapBottom ? GAP : 0;
    const h = Math.max(0, height - top - bottom);
    if (h <= 0) return null;

    const yy = y + top;

    if (radius > 0) {
        const r = Math.min(radius, width / 2, h);
        const d = `M${x},${yy + h} L${x},${yy + r} Q${x},${yy} ${x + r},${yy}
                   L${x + width - r},${yy} Q${x + width},${yy} ${x + width},${yy + r}
                   L${x + width},${yy + h} Z`;
        return <path d={d} fill={fill} />;
    }

    return <rect x={x} y={yy} width={width} height={h} fill={fill} />;
}

interface ChartDatum {
    label: string;
    total: number;
    [key: string]: string | number;
}

interface VesselBarChartProps {
    graphData: VesselGraphEntry[] | null;
    vesselName: string;
}

// Fixed sizes rather than viewport-driven scaling - this codebase has no
// precedent for JS media-query/resize hooks (pure CSS Tailwind breakpoints
// everywhere else), and recharts font sizes are SVG text attributes that
// can't be styled via Tailwind classes anyway. The chart already gets full
// card width on mobile once VesselCard stacks below `lg:`, so a fixed,
// modest size degrades softly rather than needing JS-driven sizing.
const MIN_SEGMENT_VALUE = 2;
const TICK_SIZE = 14;
const LABEL_SIZE = 13;
const SEG_LABEL_SIZE = 10;
const REF_SIZE = 12;
const Y_LABEL_SIZE = 13;
const LEGEND_SIZE = 11;

export default function VesselBarChart({ graphData, vesselName }: VesselBarChartProps) {
    const data = graphData ?? null;

    if (data === null) {
        return <div className="h-full rounded-lg border border-slate-700/30 bg-slate-900/40" />;
    }

    if (data.length === 0) {
        return (
            <div className="flex h-full items-center justify-center rounded-lg border border-slate-700/30 bg-slate-900/40">
                <span className="text-xs tracking-widest text-slate-500 uppercase">No graph data available</span>
            </div>
        );
    }

    const chartData: ChartDatum[] = data.map((d) => {
        const total = d.total || 0;
        const scale = total > Y_MAX ? Y_MAX / total : 1;
        const entry: ChartDatum = { label: String(d.hour), total };
        CRANES.forEach(({ key }) => {
            const raw = d[key] || 0;
            const scaled = raw * scale;
            entry[key] = raw > 0 ? Math.max(scaled, MIN_SEGMENT_VALUE) : 0; // scaled + floored — drives bar height
            entry[`${key}Raw`] = raw; // true unscaled count — shown in the segment label
        });
        return entry;
    });

    return (
        <div className="flex h-full flex-col">
            <p className="mb-1 shrink-0 text-center text-[10px] tracking-widest text-slate-400 uppercase sm:text-xs lg:text-base">
                {vesselName} — Moves Per Hour by Crane
            </p>
            <div className="min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 22, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#334155" />
                        <XAxis
                            dataKey="label"
                            tick={{ fill: '#cbd5e1', fontSize: TICK_SIZE, fontWeight: 600 }}
                            axisLine={{ stroke: '#475569' }}
                            tickLine={false}
                        />
                        <YAxis
                            domain={[0, Y_MAX]}
                            ticks={[0, 15, 30, 45, 60]}
                            tick={{ fill: '#cbd5e1', fontSize: TICK_SIZE, fontWeight: 600 }}
                            axisLine={false}
                            tickLine={false}
                            label={{ value: 'Moves', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: Y_LABEL_SIZE, dy: 30 }}
                        />

                        {/* Stacked bars — one segment per crane, capped at 60 with real totals labeled */}
                        {CRANES.map(({ key, color }, i) => {
                            const isFirst = i === 0;
                            const isLast = i === CRANES.length - 1;
                            return (
                                <Bar
                                    key={key}
                                    dataKey={key}
                                    stackId="moves"
                                    fill={color}
                                    isAnimationActive={false}
                                    shape={(props: unknown) => {
                                        const p = props as StackSegmentProps;
                                        return <StackSegment {...p} gapTop={!isFirst} gapBottom={!isLast} radius={isLast ? 4 : 0} />;
                                    }}
                                >
                                    <LabelList
                                        dataKey={`${key}Raw`}
                                        position="center"
                                        content={(props: unknown) => {
                                            const { x, y, width, height, value } = props as {
                                                x: number;
                                                y: number;
                                                width: number;
                                                height: number;
                                                value?: number;
                                            };
                                            if (!value) return null;
                                            return (
                                                <text
                                                    x={x + width / 2}
                                                    y={y + height / 2}
                                                    dy={4}
                                                    textAnchor="middle"
                                                    fill="#ffffff"
                                                    fontSize={SEG_LABEL_SIZE}
                                                    fontWeight={700}
                                                >
                                                    {value}
                                                </text>
                                            );
                                        }}
                                    />
                                    {isLast && (
                                        <LabelList
                                            dataKey="total"
                                            position="top"
                                            content={(props: unknown) => {
                                                const { x, y, width, value } = props as { x: number; y: number; width: number; value?: number };
                                                if (!value) return null;
                                                return (
                                                    <text x={x + width / 2} y={y - 6} textAnchor="middle" fill="#ffffff" fontSize={LABEL_SIZE} fontWeight={800}>
                                                        {value}
                                                    </text>
                                                );
                                            }}
                                        />
                                    )}
                                </Bar>
                            );
                        })}

                        {/* 20 moves/hour threshold line */}
                        <ReferenceLine
                            y={THRESHOLD}
                            stroke="#38bdf8"
                            strokeWidth={2.5}
                            strokeDasharray="8 4"
                            label={{ value: '20 moves/hr', position: 'insideTopRight', fill: '#38bdf8', fontSize: REF_SIZE, fontWeight: 700 }}
                        />

                        <Legend
                            verticalAlign="bottom"
                            height={22}
                            wrapperStyle={{ fontSize: LEGEND_SIZE }}
                            content={() => (
                                <ul className="mt-1 flex items-center justify-center gap-3" style={{ fontSize: LEGEND_SIZE }}>
                                    {LEGEND_ORDER.map((key) => (
                                        <li key={key} className="flex items-center gap-1">
                                            <span className="inline-block h-2.5 w-2.5 shrink-0" style={{ backgroundColor: CRANE_COLORS[key] }} />
                                            <span style={{ color: '#cbd5e1' }}>{key}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
