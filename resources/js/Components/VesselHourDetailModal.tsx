import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { HourDetailResponse } from '@/Pages/Operations/VesselDashboard/types';

interface Props {
    obIbId: string | null;
    vesselName: string;
    hourBucket: string | null;
    hourLabel: number | null;
    cranes: string[];
    isOpen: boolean;
    onClose: () => void;
}

function formatHourLabel(hourBucket: string | null, hourLabel: number | null) {
    if (!hourBucket) {
        return hourLabel !== null ? `${hourLabel}:00` : '';
    }

    const start = new Date(hourBucket);
    if (Number.isNaN(start.getTime())) {
        return hourLabel !== null ? `${hourLabel}:00` : '';
    }

    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const fmt = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `${fmt(start)} – ${fmt(end)}`;
}

// Ported from dict-portal's hour-drilldown-modal.tsx. Kept as its own dark,
// borderless overlay (matching Board.tsx's kiosk theme) rather than the
// light/dark-mode ContainerDetailsModal pattern used elsewhere in this app -
// this modal only ever renders inside the Vessel Dashboard board's own dark
// panel. Fetches fresh on open rather than reusing chart data - the chart
// only carries per-crane hour totals, not the per-truck/driver breakdown
// this shows.
export default function VesselHourDetailModal({ obIbId, vesselName, hourBucket, hourLabel, cranes, isOpen, onClose }: Props) {
    const [data, setData] = useState<HourDetailResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const cranesParam = cranes.join(',');

    useEffect(() => {
        if (!isOpen || !obIbId || !hourBucket) {
            setData(null);
            setError(null);
            return;
        }

        const controller = new AbortController();
        setLoading(true);
        setError(null);

        fetch(
            `/operations/vessel-dashboard/data/${obIbId}/hour?hour_bucket=${encodeURIComponent(hourBucket)}&cranes=${encodeURIComponent(cranesParam)}`,
            { signal: controller.signal },
        )
            .then((res) => res.json())
            .then((json: HourDetailResponse) => setData(json))
            .catch((err) => {
                if (err.name !== 'AbortError') {
                    setError('Failed to load hour detail.');
                }
            })
            .finally(() => setLoading(false));

        return () => controller.abort();
    }, [isOpen, obIbId, hourBucket, cranesParam]);

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4">
            <div
                className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-700 shadow-2xl"
                style={{ backgroundColor: '#0a0e17', color: '#e2e8f0' }}
            >
                <div className="sticky top-0 flex items-center justify-between border-b border-slate-700/60 bg-[#0a0e17] p-4">
                    <div>
                        <h2 className="text-lg font-bold text-cyan-400">{vesselName}</h2>
                        <p className="text-xs text-slate-400">{formatHourLabel(hourBucket, hourLabel)}</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-5 p-4">
                    {loading && <p className="text-sm text-slate-400">Loading…</p>}
                    {error && <p className="rounded-lg border border-red-700 bg-red-900/40 px-3 py-2 text-sm text-red-400">{error}</p>}

                    {data && (
                        <>
                            <section>
                                <h3 className="mb-2 text-xs font-semibold tracking-widest text-slate-400 uppercase">Crane Moves (SQL Server)</h3>
                                {data.sqlsrv.error ? (
                                    <p className="text-sm text-red-400">{data.sqlsrv.error}</p>
                                ) : data.sqlsrv.data.length === 0 ? (
                                    <p className="text-sm text-slate-500">No moves in this hour.</p>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-700 text-left text-xs text-slate-500 uppercase">
                                                <th className="py-1 pr-2">Truck</th>
                                                <th className="py-1 pr-2">Moves</th>
                                                <th className="py-1 pr-2">Drivers</th>
                                                <th className="py-1">Cranes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.sqlsrv.data.map((row) => (
                                                <tr key={row.truck} className="border-b border-slate-800">
                                                    <td className="py-1 pr-2 font-mono">{row.truck}</td>
                                                    <td className="py-1 pr-2">{row.move_count}</td>
                                                    <td className="py-1 pr-2 text-slate-400">{row.drivers || '—'}</td>
                                                    <td className="py-1 text-slate-400">{row.pows || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t border-slate-700 font-semibold">
                                                <td className="py-1 pr-2">Total</td>
                                                <td className="py-1 pr-2">{data.sqlsrv.data.reduce((sum, row) => sum + row.move_count, 0)}</td>
                                                <td className="py-1 pr-2" />
                                                <td className="py-1" />
                                            </tr>
                                        </tfoot>
                                    </table>
                                )}
                            </section>

                            <section>
                                <h3 className="mb-2 text-xs font-semibold tracking-widest text-slate-400 uppercase">
                                    Truck Model Breakdown (Supabase)
                                </h3>
                                {data.supabase.error ? (
                                    <p className="text-sm text-red-400">{data.supabase.error}</p>
                                ) : data.supabase.data.length === 0 ? (
                                    <p className="text-sm text-slate-500">No records in this hour.</p>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-700 text-left text-xs text-slate-500 uppercase">
                                                <th className="py-1 pr-2">Model</th>
                                                <th className="py-1 pr-2">Moves</th>
                                                <th className="py-1 pr-2">Drivers</th>
                                                <th className="py-1">Cranes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.supabase.data.map((row) => (
                                                <tr key={row.model} className="border-b border-slate-800">
                                                    <td className="py-1 pr-2">{row.model}</td>
                                                    <td className="py-1 pr-2">{row.move_count}</td>
                                                    <td className="py-1 pr-2 text-slate-400">{row.drivers || '—'}</td>
                                                    <td className="py-1 text-slate-400">{row.locations || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t border-slate-700 font-semibold">
                                                <td className="py-1 pr-2">Total</td>
                                                <td className="py-1 pr-2">{data.supabase.data.reduce((sum, row) => sum + row.move_count, 0)}</td>
                                                <td className="py-1 pr-2" />
                                                <td className="py-1" />
                                            </tr>
                                        </tfoot>
                                    </table>
                                )}
                            </section>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
