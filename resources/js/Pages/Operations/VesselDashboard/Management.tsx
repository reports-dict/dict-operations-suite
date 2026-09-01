import AppLayout from '@/Layouts/AppLayout';
import PageHeader from '@/Components/PageHeader';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import Input from '@/Components/ui/Input';
import Label from '@/Components/ui/Label';
import Pagination, { PaginationLink } from '@/Components/ui/Pagination';
import Select from '@/Components/ui/Select';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DashboardDataResponse, VesselSchedule, VesselSyncLogRow, VesselVisit } from './types';

const OVERRIDES_PAGE_SIZE = 10;
const SCHEDULES_PAGE_SIZE = 10;

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
            preserveState: true,
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
            preserveState: true,
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

// Client-side pager for VesselOverridePanel - the vessel list comes from a
// plain fetch() to /operations/vessel-dashboard/data (not Inertia props), so
// the Inertia-Link-driven Components/ui/Pagination doesn't apply; this just
// slices the already-fetched array instead of round-tripping to the server.
function ClientPagination({
    page,
    totalPages,
    total,
    pageSize,
    onPageChange,
}: {
    page: number;
    totalPages: number;
    total: number;
    pageSize: number;
    onPageChange: (page: number) => void;
}) {
    if (total === 0) return null;

    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    return (
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
                Showing <span className="font-medium text-slate-700 dark:text-slate-300">{from}</span>&ndash;
                <span className="font-medium text-slate-700 dark:text-slate-300">{to}</span> of{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">{total}</span>
            </p>

            <div className="-mx-1 flex items-center gap-1 overflow-x-auto px-1">
                <PageButton disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Previous page">
                    <ChevronLeft className="size-3.5" />
                </PageButton>

                {pages.map((p) => (
                    <PageButton key={p} active={p === page} onClick={() => onPageChange(p)}>
                        {p}
                    </PageButton>
                ))}

                <PageButton disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Next page">
                    <ChevronRight className="size-3.5" />
                </PageButton>
            </div>
        </div>
    );
}

function PageButton({
    active,
    disabled,
    onClick,
    children,
    ...rest
}: {
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
    children: React.ReactNode;
    'aria-label'?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md px-1.5 text-xs font-medium',
                active
                    ? 'bg-green-600 text-white'
                    : disabled
                      ? 'cursor-not-allowed text-slate-300 dark:text-slate-700'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
            )}
            {...rest}
        >
            {children}
        </button>
    );
}

function VesselOverridePanel() {
    const [vessels, setVessels] = useState<VesselVisit[]>([]);
    const [editing, setEditing] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);

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

    const totalPages = Math.max(1, Math.ceil(vessels.length / OVERRIDES_PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const paginatedVessels = vessels.slice((currentPage - 1) * OVERRIDES_PAGE_SIZE, currentPage * OVERRIDES_PAGE_SIZE);

    return (
        <div className="flex flex-col gap-3">
            {paginatedVessels.map((vessel) => (
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
            <ClientPagination
                page={currentPage}
                totalPages={totalPages}
                total={vessels.length}
                pageSize={OVERRIDES_PAGE_SIZE}
                onPageChange={setPage}
            />
        </div>
    );
}

function toDatetimeLocal(value: string): string {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ScheduleForm({ schedule, onDone, onCancel }: { schedule?: VesselSchedule; onDone: () => void; onCancel: () => void }) {
    const isLinked = Boolean(schedule?.matched_ob_ib_id);
    const [values, setValues] = useState({
        service: schedule?.service ?? '',
        line_operator: schedule?.line_operator ?? '',
        vessel_name: schedule?.vessel_name ?? '',
        etb: schedule ? toDatetimeLocal(schedule.etb) : '',
        etd: schedule ? toDatetimeLocal(schedule.etd) : '',
        estimated_moves: schedule ? String(schedule.estimated_moves) : '',
        loa_meters: schedule ? String(schedule.loa_meters) : '',
        berth_number: schedule?.berth_number ?? '',
    });
    const [saving, setSaving] = useState(false);

    const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setValues((prev) => ({ ...prev, [key]: e.target.value }));

    const handleSave = () => {
        setSaving(true);
        const body = isLinked
            ? { id: schedule!.id, estimated_moves: Number(values.estimated_moves) }
            : {
                  id: schedule?.id,
                  service: values.service,
                  line_operator: values.line_operator,
                  vessel_name: values.vessel_name,
                  etb: values.etb,
                  etd: values.etd,
                  estimated_moves: Number(values.estimated_moves),
                  loa_meters: Number(values.loa_meters),
                  berth_number: values.berth_number || null,
              };
        router.post('/operations/vessel-dashboard/schedules', body, {
            preserveScroll: true,
            preserveState: true,
            onFinish: () => {
                setSaving(false);
                onDone();
            },
        });
    };

    // Sync-linked rows are fully SPARCS-sourced except Estimated Moves (see
    // VesselScheduleSyncService) - only that field is editable here.
    if (isLinked) {
        return (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                    Linked to a live SPARCS vessel - other fields sync automatically. Only Estimated Moves is editable here.
                </p>
                <div className="max-w-[200px]">
                    <Label>Estimated Moves</Label>
                    <Input type="number" min={0} value={values.estimated_moves} onChange={set('estimated_moves')} />
                </div>
                <div className="mt-4 flex gap-2">
                    <Button variant="primary" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                    <Button variant="secondary" onClick={onCancel} disabled={saving}>
                        Cancel
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                    <Label>Service</Label>
                    <Input value={values.service} onChange={set('service')} />
                </div>
                <div>
                    <Label>Line Operator</Label>
                    <Input value={values.line_operator} onChange={set('line_operator')} />
                </div>
                <div>
                    <Label>Vessel Name</Label>
                    <Input value={values.vessel_name} onChange={set('vessel_name')} />
                </div>
                <div>
                    <Label>ETB</Label>
                    <Input type="datetime-local" value={values.etb} onChange={set('etb')} />
                </div>
                <div>
                    <Label>ETD</Label>
                    <Input type="datetime-local" value={values.etd} onChange={set('etd')} />
                </div>
                <div>
                    <Label>Estimated Moves</Label>
                    <Input type="number" min={0} value={values.estimated_moves} onChange={set('estimated_moves')} />
                </div>
                <div>
                    <Label>LOA (m)</Label>
                    <Input type="number" min={0} step="0.01" value={values.loa_meters} onChange={set('loa_meters')} />
                </div>
                <div>
                    <Label>Berth Number</Label>
                    <Input value={values.berth_number} onChange={set('berth_number')} placeholder="e.g. 3, B3, MICT-3" />
                </div>
            </div>
            <div className="mt-4 flex gap-2">
                <Button variant="primary" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save Schedule'}
                </Button>
                <Button variant="secondary" onClick={onCancel} disabled={saving}>
                    Cancel
                </Button>
            </div>
        </div>
    );
}

const SCHEDULE_STATUS_LABELS: Record<VesselSchedule['status'], string> = {
    scheduled: 'Scheduled',
    on_dock: 'On Dock',
    departed: 'Departed',
};

const SCHEDULE_STATUS_TONES: Record<VesselSchedule['status'], 'amber' | 'blue' | 'neutral'> = {
    scheduled: 'amber',
    on_dock: 'blue',
    departed: 'neutral',
};

const SCHEDULE_STATUS_OPTIONS: VesselSchedule['status'][] = ['scheduled', 'on_dock', 'departed'];

// Lets an admin explicitly attach a schedule to a specific currently-active
// live vessel - the correction path for when even the fuzzy auto-matching
// in VesselDashboardDataController doesn't catch it (or catches the wrong
// one). Sets both status and matched_ob_ib_id together, so a manually-linked
// entry still auto-transitions to departed later exactly like an
// auto-matched one does (departure detection keys off matched_ob_ib_id).
function LinkVesselRow({
    schedule,
    vessels,
    onDone,
    onCancel,
}: {
    schedule: VesselSchedule;
    vessels: VesselVisit[];
    onDone: () => void;
    onCancel: () => void;
}) {
    const [selected, setSelected] = useState(schedule.matched_ob_ib_id ?? '');
    const [saving, setSaving] = useState(false);

    const handleConfirm = () => {
        if (!selected) return;
        setSaving(true);
        router.post(
            `/operations/vessel-dashboard/schedules/${schedule.id}/status`,
            { status: 'on_dock', matched_ob_ib_id: selected },
            {
                preserveScroll: true,
                preserveState: true,
                onFinish: () => {
                    setSaving(false);
                    onDone();
                },
            },
        );
    };

    return (
        <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[260px] flex-1">
                <Label>Live Vessel</Label>
                <Select value={selected} onChange={(e) => setSelected(e.target.value)}>
                    <option value="">Select a vessel…</option>
                    {vessels.map((v) => (
                        <option key={v.ob_ib_id} value={v.ob_ib_id}>
                            {v.vessel_name} (SVC {v.service} · OPR {v.line_op})
                        </option>
                    ))}
                </Select>
                {vessels.length === 0 && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">No active vessels right now.</p>}
            </div>
            <Button variant="primary" onClick={handleConfirm} disabled={saving || !selected}>
                {saving ? 'Linking…' : 'Confirm Link'}
            </Button>
            <Button variant="secondary" onClick={onCancel} disabled={saving}>
                Cancel
            </Button>
        </div>
    );
}

function ScheduleTableRow({
    schedule,
    vessels,
    isEditing,
    isLinking,
    onEditToggle,
    onLinkToggle,
    onDelete,
    onStatusChange,
    onEditDone,
    onLinkDone,
}: {
    schedule: VesselSchedule;
    vessels: VesselVisit[];
    isEditing: boolean;
    isLinking: boolean;
    onEditToggle: () => void;
    onLinkToggle: () => void;
    onDelete: () => void;
    onStatusChange: (status: VesselSchedule['status']) => void;
    onEditDone: () => void;
    onLinkDone: () => void;
}) {
    return (
        <>
            <tr>
                <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-white">{schedule.vessel_name}</td>
                <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{schedule.service}</td>
                <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{schedule.line_operator}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">{new Date(schedule.etb).toLocaleString()}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">{new Date(schedule.etd).toLocaleString()}</td>
                <td className="px-3 py-2.5 text-right text-slate-600 dark:text-slate-300">{schedule.estimated_moves}</td>
                <td className="px-3 py-2.5 text-right text-slate-600 dark:text-slate-300">{schedule.loa_meters}m</td>
                <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{schedule.berth_number || '—'}</td>
                <td className="px-3 py-2.5 text-center">
                    <Badge tone={SCHEDULE_STATUS_TONES[schedule.status]}>{SCHEDULE_STATUS_LABELS[schedule.status]}</Badge>
                </td>
                <td className="px-3 py-2.5">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {/* Sync-owned status for a linked row - matched_ob_ib_id came
                            directly from SPARCS's own gkey, not a guess, so there's no
                            "wrong match" here for Link to Vessel / Mark scheduled/on_dock
                            to fix, and neither would stick anyway (the next sync just
                            recomputes them from the live phase). Mark Departed is the one
                            exception: it's a terminal state VesselScheduleSyncService
                            skips resyncing once set (see upsertRow()), so it's offered for
                            linked rows too and actually sticks. */}
                        {schedule.matched_ob_ib_id ? (
                            schedule.status !== 'departed' && (
                                <Button variant="ghost" onClick={() => onStatusChange('departed')}>
                                    Mark Departed
                                </Button>
                            )
                        ) : (
                            <>
                                {schedule.status !== 'departed' && (
                                    <Button variant="ghost" onClick={onLinkToggle}>
                                        {isLinking ? 'Close' : 'Link to Vessel'}
                                    </Button>
                                )}
                                {SCHEDULE_STATUS_OPTIONS.filter((s) => s !== schedule.status).map((s) => (
                                    <Button key={s} variant="ghost" onClick={() => onStatusChange(s)}>
                                        Mark {SCHEDULE_STATUS_LABELS[s]}
                                    </Button>
                                ))}
                            </>
                        )}
                        <Button variant="secondary" onClick={onEditToggle}>
                            {isEditing ? 'Close' : 'Edit'}
                        </Button>
                        <Button variant="danger" onClick={onDelete}>
                            Delete
                        </Button>
                    </div>
                </td>
            </tr>
            {isLinking && (
                <tr>
                    <td colSpan={10} className="bg-slate-50 px-3 py-3 dark:bg-slate-950/40">
                        <LinkVesselRow schedule={schedule} vessels={vessels} onDone={onLinkDone} onCancel={onLinkToggle} />
                    </td>
                </tr>
            )}
            {isEditing && (
                <tr>
                    <td colSpan={10} className="bg-slate-50 px-3 py-3 dark:bg-slate-950/40">
                        <ScheduleForm schedule={schedule} onDone={onEditDone} onCancel={onEditToggle} />
                    </td>
                </tr>
            )}
        </>
    );
}

// Shown on the board (Board.tsx) whenever there are no active vessel visits
// - a manually data-entered list of upcoming vessels. Mirrors
// VesselOverridePanel's structure: fetches the same /operations/vessel-dashboard/data
// endpoint (which now folds schedules in alongside live vessels) rather than
// a separate endpoint/poll loop. Status normally transitions itself
// (VesselDashboardDataController auto-matches against the live sparcsn4
// feed by vessel name, exact then fuzzy) - the "Mark ..."/"Link to Vessel"
// actions here are the manual override for when that never fires or fires
// wrong.
function VesselSchedulePanel() {
    const [schedules, setSchedules] = useState<VesselSchedule[]>([]);
    const [vessels, setVessels] = useState<VesselVisit[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<number | 'new' | null>(null);
    const [linking, setLinking] = useState<number | null>(null);
    // Defaults to hiding Departed - same default visibility the old
    // standalone "Show Departed" toggle had, now expressed as a status
    // filter instead of a separate control.
    const [statusFilter, setStatusFilter] = useState<Set<VesselSchedule['status']>>(new Set(['scheduled', 'on_dock']));
    const [serviceFilter, setServiceFilter] = useState('');
    const [operatorFilter, setOperatorFilter] = useState('');
    const [nameSearch, setNameSearch] = useState('');
    const [page, setPage] = useState(1);

    const fetchData = () => {
        setLoading(true);
        fetch('/operations/vessel-dashboard/data')
            .then((res) => res.json())
            .then((data: DashboardDataResponse) => {
                setSchedules(data.schedules || []);
                setVessels(data.vessels || []);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDelete = (id: number) => {
        router.delete(`/operations/vessel-dashboard/schedules/${id}`, {
            preserveScroll: true,
            preserveState: true,
            onFinish: fetchData,
        });
    };

    const handleStatusChange = (id: number, status: VesselSchedule['status']) => {
        router.post(
            `/operations/vessel-dashboard/schedules/${id}/status`,
            { status },
            { preserveScroll: true, preserveState: true, onFinish: fetchData },
        );
    };

    const toggleStatusFilter = (status: VesselSchedule['status']) => {
        setStatusFilter((prev) => {
            const next = new Set(prev);
            next.has(status) ? next.delete(status) : next.add(status);
            return next;
        });
    };

    if (loading) return <p className="text-sm text-slate-500 dark:text-slate-400">Loading schedules…</p>;

    // Filter option lists reflect the values actually present, not a fixed
    // hardcoded list - stays correct as new services/operators get entered.
    const serviceOptions = [...new Set(schedules.map((s) => s.service))].sort();
    const operatorOptions = [...new Set(schedules.map((s) => s.line_operator))].sort();

    const filteredSchedules = schedules.filter((s) => {
        if (!statusFilter.has(s.status)) return false;
        if (serviceFilter && s.service !== serviceFilter) return false;
        if (operatorFilter && s.line_operator !== operatorFilter) return false;
        if (nameSearch && !s.vessel_name.toLowerCase().includes(nameSearch.toLowerCase())) return false;
        return true;
    });

    const totalPages = Math.max(1, Math.ceil(filteredSchedules.length / SCHEDULES_PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);
    const paginatedSchedules = filteredSchedules.slice((currentPage - 1) * SCHEDULES_PAGE_SIZE, currentPage * SCHEDULES_PAGE_SIZE);

    return (
        <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                <div>
                    <Label>Status</Label>
                    <div className="flex flex-wrap gap-1.5">
                        {SCHEDULE_STATUS_OPTIONS.map((status) => (
                            <button
                                key={status}
                                type="button"
                                onClick={() => toggleStatusFilter(status)}
                                className={cn(
                                    'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                                    statusFilter.has(status)
                                        ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300'
                                        : 'border-slate-300 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800',
                                )}
                            >
                                {SCHEDULE_STATUS_LABELS[status]}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="min-w-[140px]">
                    <Label>Service</Label>
                    <Select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}>
                        <option value="">All</option>
                        {serviceOptions.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </Select>
                </div>
                <div className="min-w-[160px]">
                    <Label>Line Operator</Label>
                    <Select value={operatorFilter} onChange={(e) => setOperatorFilter(e.target.value)}>
                        <option value="">All</option>
                        {operatorOptions.map((o) => (
                            <option key={o} value={o}>
                                {o}
                            </option>
                        ))}
                    </Select>
                </div>
                <div className="min-w-[200px] flex-1">
                    <Label>Vessel Name</Label>
                    <Input value={nameSearch} onChange={(e) => setNameSearch(e.target.value)} placeholder="Search…" />
                </div>
            </div>

            <div className="flex justify-end">
                <Button variant="primary" onClick={() => setEditing(editing === 'new' ? null : 'new')}>
                    <Plus className="size-4" />
                    {editing === 'new' ? 'Close' : 'Add Schedule'}
                </Button>
            </div>

            {editing === 'new' && (
                <Card className="p-4">
                    <h3 className="font-semibold text-slate-900 dark:text-white">New Schedule</h3>
                    <ScheduleForm
                        onDone={() => {
                            fetchData();
                            setEditing(null);
                        }}
                        onCancel={() => setEditing(null)}
                    />
                </Card>
            )}

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs text-slate-500 uppercase dark:bg-slate-800/60 dark:text-slate-400">
                            <tr>
                                <th className="px-3 py-2.5 text-left">Vessel</th>
                                <th className="px-3 py-2.5 text-left">Service</th>
                                <th className="px-3 py-2.5 text-left">Operator</th>
                                <th className="px-3 py-2.5 text-left">ETB</th>
                                <th className="px-3 py-2.5 text-left">ETD</th>
                                <th className="px-3 py-2.5 text-right">Moves</th>
                                <th className="px-3 py-2.5 text-right">LOA</th>
                                <th className="px-3 py-2.5 text-left">Berth</th>
                                <th className="px-3 py-2.5 text-center">Status</th>
                                <th className="px-3 py-2.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {paginatedSchedules.map((schedule) => (
                                <ScheduleTableRow
                                    key={schedule.id}
                                    schedule={schedule}
                                    vessels={vessels}
                                    isEditing={editing === schedule.id}
                                    isLinking={linking === schedule.id}
                                    onEditToggle={() => setEditing(editing === schedule.id ? null : schedule.id)}
                                    onLinkToggle={() => setLinking(linking === schedule.id ? null : schedule.id)}
                                    onDelete={() => handleDelete(schedule.id)}
                                    onStatusChange={(status) => handleStatusChange(schedule.id, status)}
                                    onEditDone={() => {
                                        fetchData();
                                        setEditing(null);
                                    }}
                                    onLinkDone={() => {
                                        fetchData();
                                        setLinking(null);
                                    }}
                                />
                            ))}
                            {filteredSchedules.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="px-3 py-8 text-center text-slate-500 dark:text-slate-400">
                                        {schedules.length === 0 ? 'No scheduled vessels yet.' : 'No schedules match the current filters.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <ClientPagination
                page={currentPage}
                totalPages={totalPages}
                total={filteredSchedules.length}
                pageSize={SCHEDULES_PAGE_SIZE}
                onPageChange={setPage}
            />
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

            <div className="mb-6">
                <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Planned Figure Overrides</h2>
                <VesselOverridePanel />
            </div>

            <div className="mb-6">
                <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">Vessel Schedules</h2>
                <VesselSchedulePanel />
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
        </AppLayout>
    );
}
