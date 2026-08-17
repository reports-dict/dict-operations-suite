import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import Input from '@/Components/ui/Input';
import Label from '@/Components/ui/Label';
import Pagination, { PaginationLink } from '@/Components/ui/Pagination';
import Select from '@/Components/ui/Select';
import AppLayout from '@/Layouts/AppLayout';
import PageHeader from '@/Components/PageHeader';
import { SharedProps } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { YardAllocationRow, YardBlockRow, YardSyncLogRow } from './types';

interface Paginated<T> {
    data: T[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
}

interface Stats {
    total_containers: number;
    total_blocks: number;
    total_allocations: number;
    last_sync: string | null;
    last_sync_status: 'success' | 'error' | null;
    success_this_week: number;
    failed_this_week: number;
}

interface Props {
    stats: Stats;
    logs: Paginated<YardSyncLogRow>;
    blocks: Paginated<YardBlockRow>;
    allocations: Paginated<YardAllocationRow>;
}

const EMPTY_BLOCK_FORM = {
    name: '',
    bay_start: 1,
    bay_end: 1,
    row_start: 'A',
    row_end: 'F',
    max_tier: 5,
    facility: 'Terminal' as 'Terminal' | 'ECD',
    road_side: 'both' as 'row_start' | 'row_end' | 'both',
    excluded_rows: '',
    is_active: true,
};

function BlockForm({
    initial,
    onSubmit,
    onCancel,
    saving,
}: {
    initial: typeof EMPTY_BLOCK_FORM;
    onSubmit: (data: typeof EMPTY_BLOCK_FORM) => void;
    onCancel: () => void;
    saving: boolean;
}) {
    const [form, setForm] = useState(initial);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onSubmit(form);
    };

    return (
        <form onSubmit={handleSubmit} className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                    <Label>Block Name</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                    <Label>Facility</Label>
                    <Select value={form.facility} onChange={(e) => setForm({ ...form, facility: e.target.value as 'Terminal' | 'ECD' })}>
                        <option value="Terminal">Terminal</option>
                        <option value="ECD">ECD</option>
                    </Select>
                </div>
                <div>
                    <Label>Bay Start</Label>
                    <Input type="number" min={1} value={form.bay_start} onChange={(e) => setForm({ ...form, bay_start: Number(e.target.value) })} required />
                </div>
                <div>
                    <Label>Bay End</Label>
                    <Input type="number" min={1} value={form.bay_end} onChange={(e) => setForm({ ...form, bay_end: Number(e.target.value) })} required />
                </div>
                <div>
                    <Label>Row Start</Label>
                    <Input maxLength={1} value={form.row_start} onChange={(e) => setForm({ ...form, row_start: e.target.value.toUpperCase() })} required />
                </div>
                <div>
                    <Label>Row End</Label>
                    <Input maxLength={1} value={form.row_end} onChange={(e) => setForm({ ...form, row_end: e.target.value.toUpperCase() })} required />
                </div>
                <div>
                    <Label>Max Tier</Label>
                    <Input type="number" min={1} max={10} value={form.max_tier} onChange={(e) => setForm({ ...form, max_tier: Number(e.target.value) })} required />
                </div>
                <div>
                    <Label>Road Lane Access</Label>
                    <Select value={form.road_side} onChange={(e) => setForm({ ...form, road_side: e.target.value as typeof form.road_side })}>
                        <option value="row_start">Row Start (Top)</option>
                        <option value="row_end">Row End (Bottom)</option>
                        <option value="both">Both</option>
                    </Select>
                </div>
                <div className="col-span-2 sm:col-span-4">
                    <Label>Excluded Bays (comma-separated, e.g. 4,8,11)</Label>
                    <Input value={form.excluded_rows} onChange={(e) => setForm({ ...form, excluded_rows: e.target.value })} placeholder="Leave empty if none" />
                </div>
                <div className="flex items-center gap-2">
                    <input
                        id="block-is-active"
                        type="checkbox"
                        checked={form.is_active}
                        onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300"
                    />
                    <Label htmlFor="block-is-active">Active</Label>
                </div>
            </div>
            <div className="mt-4 flex gap-2">
                <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                </Button>
                <Button type="button" variant="secondary" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </form>
    );
}

function BlockManagementSection({ blocks, canManage }: { blocks: Paginated<YardBlockRow>; canManage: boolean }) {
    const [editing, setEditing] = useState<number | 'new' | null>(null);
    const [saving, setSaving] = useState(false);

    const startEdit = (block: YardBlockRow) => setEditing(block.id);
    const startCreate = () => setEditing('new');
    const cancel = () => setEditing(null);

    const submit = (id: number | 'new', data: typeof EMPTY_BLOCK_FORM) => {
        setSaving(true);
        const done = () => {
            setSaving(false);
            setEditing(null);
        };
        if (id === 'new') {
            router.post('/operations/container-yard/blocks', data, { preserveScroll: true, onFinish: done });
        } else {
            router.put(`/operations/container-yard/blocks/${id}`, data, { preserveScroll: true, onFinish: done });
        }
    };

    const destroy = (block: YardBlockRow) => {
        if (!confirm(`Delete block "${block.name}"?`)) return;
        router.delete(`/operations/container-yard/blocks/${block.id}`, { preserveScroll: true });
    };

    return (
        <Card className="mb-6 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Blocks</h2>
                {canManage && editing === null && (
                    <Button variant="primary" onClick={startCreate}>
                        <Plus className="size-3.5" /> Add Block
                    </Button>
                )}
            </div>

            <div className="p-4">
                {canManage && editing === 'new' && (
                    <BlockForm initial={EMPTY_BLOCK_FORM} onSubmit={(data) => submit('new', data)} onCancel={cancel} saving={saving} />
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs text-slate-500 uppercase dark:bg-slate-800/60 dark:text-slate-400">
                            <tr>
                                <th className="px-3 py-2 text-left">Name</th>
                                <th className="px-3 py-2 text-left">Bays</th>
                                <th className="px-3 py-2 text-left">Rows</th>
                                <th className="px-3 py-2 text-left">Max Tier</th>
                                <th className="px-3 py-2 text-left">Facility</th>
                                <th className="px-3 py-2 text-left">Road Lane</th>
                                <th className="px-3 py-2 text-left">Status</th>
                                {canManage && <th className="px-3 py-2 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {blocks.data.map((block) =>
                                editing === block.id ? (
                                    <tr key={block.id}>
                                        <td colSpan={canManage ? 8 : 7} className="p-0">
                                            <BlockForm
                                                initial={{
                                                    name: block.name,
                                                    bay_start: block.bay_start,
                                                    bay_end: block.bay_end,
                                                    row_start: block.row_start,
                                                    row_end: block.row_end,
                                                    max_tier: block.max_tier,
                                                    facility: block.facility,
                                                    road_side: block.road_side,
                                                    excluded_rows: block.excluded_rows ?? '',
                                                    is_active: block.is_active,
                                                }}
                                                onSubmit={(data) => submit(block.id, data)}
                                                onCancel={cancel}
                                                saving={saving}
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    <tr key={block.id}>
                                        <td className="px-3 py-2 font-medium text-slate-900 dark:text-white">{block.name}</td>
                                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                                            {block.bay_start}–{block.bay_end}
                                        </td>
                                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                                            {block.row_start}–{block.row_end}
                                        </td>
                                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{block.max_tier}</td>
                                        <td className="px-3 py-2">
                                            <Badge tone={block.facility === 'Terminal' ? 'blue' : 'amber'}>{block.facility}</Badge>
                                        </td>
                                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                                            {block.road_side === 'row_start' ? 'Top' : block.road_side === 'row_end' ? 'Bottom' : 'Both'}
                                        </td>
                                        <td className="px-3 py-2">
                                            <Badge tone={block.is_active ? 'green' : 'red'}>{block.is_active ? 'Active' : 'Inactive'}</Badge>
                                        </td>
                                        {canManage && (
                                            <td className="px-3 py-2 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" onClick={() => startEdit(block)} title="Edit">
                                                        <Pencil className="size-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" onClick={() => destroy(block)} title="Delete">
                                                        <Trash2 className="size-3.5 text-red-500" />
                                                    </Button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ),
                            )}
                            {blocks.data.length === 0 && (
                                <tr>
                                    <td colSpan={canManage ? 8 : 7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                                        No blocks yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <Pagination links={blocks.links} from={blocks.from} to={blocks.to} total={blocks.total} />
        </Card>
    );
}

const EMPTY_ALLOCATION_FORM = {
    service: '',
    discharge_port: '',
    iso_basic_length: '',
    reefer_type: '',
    location: '',
};

function AllocationForm({
    initial,
    onSubmit,
    onCancel,
    saving,
}: {
    initial: typeof EMPTY_ALLOCATION_FORM;
    onSubmit: (data: typeof EMPTY_ALLOCATION_FORM) => void;
    onCancel: () => void;
    saving: boolean;
}) {
    const [form, setForm] = useState(initial);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onSubmit(form);
    };

    return (
        <form onSubmit={handleSubmit} className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <div>
                    <Label>Service</Label>
                    <Input value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} placeholder="e.g. AEX1" />
                </div>
                <div>
                    <Label>Discharge Port</Label>
                    <Input value={form.discharge_port} onChange={(e) => setForm({ ...form, discharge_port: e.target.value })} placeholder="e.g. SGSIN" />
                </div>
                <div>
                    <Label>ISO Basic Length</Label>
                    <Input value={form.iso_basic_length} onChange={(e) => setForm({ ...form, iso_basic_length: e.target.value })} placeholder="e.g. 20ft" />
                </div>
                <div>
                    <Label>Reefer Type</Label>
                    <Input value={form.reefer_type} onChange={(e) => setForm({ ...form, reefer_type: e.target.value })} placeholder="e.g. RFR / DRY" />
                </div>
                <div>
                    <Label>Location *</Label>
                    <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Block A" required />
                </div>
            </div>
            <div className="mt-4 flex gap-2">
                <Button type="submit" variant="primary" disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                </Button>
                <Button type="button" variant="secondary" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </form>
    );
}

function AllocationManagementSection({ allocations, canManage }: { allocations: Paginated<YardAllocationRow>; canManage: boolean }) {
    const [editing, setEditing] = useState<number | 'new' | null>(null);
    const [saving, setSaving] = useState(false);

    const submit = (id: number | 'new', data: typeof EMPTY_ALLOCATION_FORM) => {
        setSaving(true);
        const done = () => {
            setSaving(false);
            setEditing(null);
        };
        if (id === 'new') {
            router.post('/operations/container-yard/allocations', data, { preserveScroll: true, onFinish: done });
        } else {
            router.put(`/operations/container-yard/allocations/${id}`, data, { preserveScroll: true, onFinish: done });
        }
    };

    const destroy = (allocation: YardAllocationRow) => {
        if (!confirm(`Delete allocation for location "${allocation.location}"?`)) return;
        router.delete(`/operations/container-yard/allocations/${allocation.id}`, { preserveScroll: true });
    };

    return (
        <Card className="mb-6 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Allocations</h2>
                {canManage && editing === null && (
                    <Button variant="primary" onClick={() => setEditing('new')}>
                        <Plus className="size-3.5" /> Add Allocation
                    </Button>
                )}
            </div>

            <div className="p-4">
                {canManage && editing === 'new' && (
                    <AllocationForm initial={EMPTY_ALLOCATION_FORM} onSubmit={(data) => submit('new', data)} onCancel={() => setEditing(null)} saving={saving} />
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs text-slate-500 uppercase dark:bg-slate-800/60 dark:text-slate-400">
                            <tr>
                                <th className="px-3 py-2 text-left">Service</th>
                                <th className="px-3 py-2 text-left">Discharge Port</th>
                                <th className="px-3 py-2 text-left">ISO Length</th>
                                <th className="px-3 py-2 text-left">Reefer Type</th>
                                <th className="px-3 py-2 text-left">Location</th>
                                {canManage && <th className="px-3 py-2 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {allocations.data.map((allocation) =>
                                editing === allocation.id ? (
                                    <tr key={allocation.id}>
                                        <td colSpan={canManage ? 6 : 5} className="p-0">
                                            <AllocationForm
                                                initial={{
                                                    service: allocation.service ?? '',
                                                    discharge_port: allocation.discharge_port ?? '',
                                                    iso_basic_length: allocation.iso_basic_length ?? '',
                                                    reefer_type: allocation.reefer_type ?? '',
                                                    location: allocation.location,
                                                }}
                                                onSubmit={(data) => submit(allocation.id, data)}
                                                onCancel={() => setEditing(null)}
                                                saving={saving}
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    <tr key={allocation.id}>
                                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{allocation.service || '—'}</td>
                                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{allocation.discharge_port || '—'}</td>
                                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{allocation.iso_basic_length || '—'}</td>
                                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{allocation.reefer_type || '—'}</td>
                                        <td className="px-3 py-2 font-semibold text-indigo-700 dark:text-indigo-300">{allocation.location}</td>
                                        {canManage && (
                                            <td className="px-3 py-2 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" onClick={() => setEditing(allocation.id)} title="Edit">
                                                        <Pencil className="size-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" onClick={() => destroy(allocation)} title="Delete">
                                                        <Trash2 className="size-3.5 text-red-500" />
                                                    </Button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ),
                            )}
                            {allocations.data.length === 0 && (
                                <tr>
                                    <td colSpan={canManage ? 6 : 5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                                        No allocations yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <Pagination links={allocations.links} from={allocations.from} to={allocations.to} total={allocations.total} />
        </Card>
    );
}

export default function ContainerYardManagement({ stats, logs, blocks, allocations }: Props) {
    const { auth } = usePage<SharedProps>().props;
    const canManage = auth.user?.permissions.includes('operations.container-yard-manage.view') || auth.user?.roles.includes('superadmin');

    const syncNow = () => router.post('/operations/container-yard/sync-now', {}, { preserveScroll: true });

    const cards: { label: string; value: string | number; sub?: string | null }[] = [
        { label: 'Total Yard Containers', value: stats.total_containers },
        { label: 'Blocks', value: stats.total_blocks },
        { label: 'Allocations', value: stats.total_allocations },
        {
            label: 'Last Sync',
            value: stats.last_sync ? new Date(stats.last_sync).toLocaleString() : 'Never',
            sub: stats.last_sync_status,
        },
    ];

    return (
        <AppLayout>
            <PageHeader
                title="Container Yard Management"
                description="Sync health for the yard container sync, plus Block and Allocation management."
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
                            <Badge tone={c.sub === 'success' ? 'green' : c.sub === 'error' ? 'red' : 'neutral'} className="mt-1">
                                {c.sub}
                            </Badge>
                        )}
                    </Card>
                ))}
            </div>

            <BlockManagementSection blocks={blocks} canManage={!!canManage} />
            <AllocationManagementSection allocations={allocations} canManage={!!canManage} />

            <Card className="mb-6 overflow-hidden">
                <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Sync Log</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs text-slate-500 uppercase dark:bg-slate-800/60 dark:text-slate-400">
                            <tr>
                                <th className="px-4 py-2.5 text-left">Ran At</th>
                                <th className="px-4 py-2.5 text-center">Trigger</th>
                                <th className="px-4 py-2.5 text-center">Status</th>
                                <th className="px-4 py-2.5 text-right">Count</th>
                                <th className="px-4 py-2.5 text-left">Message</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {logs.data.map((log) => (
                                <tr key={log.id}>
                                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-700 dark:text-slate-300">
                                        {new Date(log.ran_at).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                        <Badge tone="neutral">{log.trigger}</Badge>
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                        <Badge tone={log.status === 'success' ? 'green' : 'red'}>{log.status}</Badge>
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">{log.count}</td>
                                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{log.message ?? '—'}</td>
                                </tr>
                            ))}
                            {logs.data.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
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
