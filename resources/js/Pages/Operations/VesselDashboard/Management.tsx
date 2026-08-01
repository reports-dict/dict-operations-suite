import AppLayout from '@/Layouts/AppLayout';
import PageHeader from '@/Components/PageHeader';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import Input from '@/Components/ui/Input';
import Label from '@/Components/ui/Label';
import Pagination, { PaginationLink } from '@/Components/ui/Pagination';
import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { DashboardDataResponse, VesselSyncLogRow, VesselVisit } from './types';

interface Stats {
    total_visits: number;
    last_sync: string | null;
    last_sync_status: 'success' | 'failed' | null;
    success_this_week: number;
    failed_this_week: number;
}

interface PaginatedLogs {
    data: VesselSyncLogRow[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
}

interface Props {
    stats: Stats;
    logs: PaginatedLogs;
}

const LOADING_FIELDS: { key: 'load_plan_fcl_20ft' | 'load_plan_fcl_40ft' | 'load_plan_empty_20ft' | 'load_plan_empty_40ft'; label: string }[] = [
    { key: 'load_plan_fcl_20ft', label: 'Loading FCL 20FT' },
    { key: 'load_plan_fcl_40ft', label: 'Loading FCL 40FT' },
    { key: 'load_plan_empty_20ft', label: 'Loading MTY 20FT' },
    { key: 'load_plan_empty_40ft', label: 'Loading MTY 40FT' },
];

// Only the four loading sub-fields are editable here - discharge planned
// figures come from a real live sparcsn4 subquery and are never overridden,
// matching vessel-dashboard-app's original admin panel (Api\DashboardController
// zeroes out the loading fields by default; discharge is always live).
function OverrideForm({ vessel, onDone }: { vessel: VesselVisit; onDone: () => void }) {
    const [values, setValues] = useState<Record<string, string>>(() =>
        Object.fromEntries(LOADING_FIELDS.map((f) => [f.key, String(vessel[f.key] ?? '')])),
    );
    const [saving, setSaving] = useState(false);

    const autoSum = (vals: Record<string, string>) => LOADING_FIELDS.reduce((sum, f) => sum + (Number(vals[f.key]) || 0), 0);

    const handleSave = () => {
        setSaving(true);
        const body: Record<string, string | number | null> = {
            ob_ib_id: vessel.ob_ib_id,
            total_planned_loading_wi: autoSum(values),
        };
        LOADING_FIELDS.forEach((f) => {
            body[f.key] = values[f.key] === '' ? null : Number(values[f.key]);
        });
        router.post('/operations/vessel-dashboard/overrides', body, {
            preserveScroll: true,
            onFinish: () => {
                setSaving(false);
                onDone();
            },
        });
    };

    const handleRemove = () => {
        setSaving(true);
        router.delete(`/operations/vessel-dashboard/overrides/${encodeURIComponent(vessel.ob_ib_id)}`, {
            preserveScroll: true,
            onFinish: () => {
                setSaving(false);
                onDone();
            },
        });
    };

    return (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Leave blank to use the live query value.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {LOADING_FIELDS.map((f) => (
                    <div key={f.key}>
                        <Label>{f.label}</Label>
                        <Input
                            type="number"
                            min={0}
                            value={values[f.key]}
                            onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                            placeholder="Live data"
                        />
                    </div>
                ))}
            </div>
            <div className="mt-3 max-w-[200px]">
                <Label>Total Planned Loading</Label>
                <Input type="number" readOnly value={autoSum(values)} className="cursor-not-allowed opacity-70" />
            </div>
            <div className="mt-4 flex gap-2">
                <Button variant="primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save Override'}
                </Button>
                {vessel.has_override && (
                    <Button variant="danger" onClick={handleRemove} disabled={saving}>
                        Remove Override
                    </Button>
                )}
            </div>
        </div>
    );
}

function VesselOverridePanel() {
    const [vessels, setVessels] = useState<VesselVisit[]>([]);
    const [editing, setEditing] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchVessels = () => {
        setLoading(true);
        fetch('/operations/vessel-dashboard/data')
            .then((res) => res.json())
            .then((data: DashboardDataResponse) => setVessels(data.vessels || []))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchVessels();
    }, []);

    if (loading) return <p className="text-sm text-slate-500 dark:text-slate-400">Loading vessels…</p>;
    if (!vessels.length) return <p className="text-sm text-slate-500 dark:text-slate-400">No active vessel visits.</p>;

    return (
        <div className="flex flex-col gap-3">
            {vessels.map((vessel) => (
                <Card key={vessel.ob_ib_id} className="p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-slate-900 dark:text-white">{vessel.vessel_name}</h3>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                SVC {vessel.service} · OPR {vessel.line_op}
                            </span>
                            {vessel.has_override && <Badge tone="amber">Override Active</Badge>}
                        </div>
                        <Button variant="secondary" onClick={() => setEditing(editing === vessel.ob_ib_id ? null : vessel.ob_ib_id)}>
                            {editing === vessel.ob_ib_id ? 'Close' : 'Edit Planned'}
                        </Button>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500 sm:grid-cols-4 dark:text-slate-400">
                        <span>
                            Discharge Planned: <b className="text-slate-700 dark:text-slate-200">{vessel.total_planned_discharge}</b>
                        </span>
                        <span>
                            Discharged: <b className="text-slate-700 dark:text-slate-200">{vessel.total_discharged_count}</b>
                        </span>
                        <span>
                            Loading Planned: <b className="text-slate-700 dark:text-slate-200">{vessel.total_planned_loading_wi}</b>
                        </span>
                        <span>
                            Loaded: <b className="text-slate-700 dark:text-slate-200">{vessel.total_loaded_count}</b>
                        </span>
                    </div>
                    {editing === vessel.ob_ib_id && (
                        <OverrideForm
                            vessel={vessel}
                            onDone={() => {
                                fetchVessels();
                                setEditing(null);
                            }}
                        />
                    )}
                </Card>
            ))}
        </div>
    );
}

function StatusBadge({ status }: { status: 'success' | 'failed' }) {
    return <Badge tone={status === 'success' ? 'green' : 'red'}>{status}</Badge>;
}

function ErrorCell({ message }: { message: string | null }) {
    const [expanded, setExpanded] = useState(false);
    if (!message) return <span className="text-slate-400 dark:text-slate-600">—</span>;
    const preview = message.length > 80 ? message.slice(0, 80) + '…' : message;
    return (
        <span className="text-xs text-red-600 dark:text-red-400">
            {expanded ? message : preview}
            {message.length > 80 && (
                <button onClick={() => setExpanded(!expanded)} className="ml-1 text-green-600 underline dark:text-green-400">
                    {expanded ? 'less' : 'more'}
                </button>
            )}
        </span>
    );
}

export default function VesselDashboardManagement({ stats, logs }: Props) {
    const syncNow = () => router.post('/operations/vessel-dashboard/sync-now', {}, { preserveScroll: true });

    const cards: { label: string; value: string | number; sub?: string | null }[] = [
        { label: 'Total Vessel Visits', value: stats.total_visits },
        {
            label: 'Last Sync',
            value: stats.last_sync ? new Date(stats.last_sync).toLocaleString() : 'Never',
            sub: stats.last_sync_status,
        },
        { label: 'Successful Syncs (this week)', value: stats.success_this_week },
        { label: 'Failed Syncs (this week)', value: stats.failed_this_week },
    ];

    return (
        <AppLayout>
            <PageHeader
                title="Vessel Dashboard Management"
                description="Sync health for the hourly vessel-visit sync, plus planned-figure overrides."
                actions={
                    <Button variant="secondary" onClick={syncNow}>
                        Sync Now
                    </Button>
                }
            />

            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((c) => (
                    <Card key={c.label} className="p-4">
                        <p className="text-xs text-slate-500 dark:text-slate-400">{c.label}</p>
                        <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{c.value}</p>
                        {c.sub && (
                            <Badge tone={c.sub === 'success' ? 'green' : c.sub === 'failed' ? 'red' : 'neutral'} className="mt-1">
                                {c.sub}
                            </Badge>
                        )}
                    </Card>
                ))}
            </div>

            <Card className="mb-6 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs text-slate-500 uppercase dark:bg-slate-800/60 dark:text-slate-400">
                            <tr>
                                <th className="px-4 py-2.5 text-left">Ran At</th>
                                <th className="px-4 py-2.5 text-right">Fetched</th>
                                <th className="px-4 py-2.5 text-right">Upserted</th>
                                <th className="px-4 py-2.5 text-center">Status</th>
                                <th className="px-4 py-2.5 text-right">Duration (ms)</th>
                                <th className="px-4 py-2.5 text-left">Error</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {logs.data.map((log) => (
                                <tr key={log.id}>
                                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-700 dark:text-slate-300">
                                        {new Date(log.ran_at).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">{log.rows_fetched}</td>
                                    <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">{log.rows_upserted}</td>
                                    <td className="px-4 py-2.5 text-center">
                                        <StatusBadge status={log.status} />
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">{log.duration_ms}</td>
                                    <td className="px-4 py-2.5">
                                        <ErrorCell message={log.error_message} />
                                    </td>
                                </tr>
                            ))}
                            {logs.data.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                                        No sync logs yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination links={logs.links} from={logs.from} to={logs.to} total={logs.total} />
            </Card>

            <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Planned Figure Overrides</h2>
            <VesselOverridePanel />
        </AppLayout>
    );
}
