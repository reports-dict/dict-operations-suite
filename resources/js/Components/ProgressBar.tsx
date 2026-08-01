interface ProgressBarProps {
    value: number;
    max: number;
    colorClass?: string;
}

export default function ProgressBar({ value, max, colorClass = 'bg-cyan-500' }: ProgressBarProps) {
    const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
    return (
        <div className="flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-700">
                <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${pct}%` }} />
            </div>
            <span className="w-10 text-right text-xs text-slate-400">{pct}%</span>
        </div>
    );
}
