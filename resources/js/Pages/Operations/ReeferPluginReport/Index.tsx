import PageHeader from '@/Components/PageHeader';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import Input from '@/Components/ui/Input';
import Label from '@/Components/ui/Label';
import Pagination, { PaginationLink } from '@/Components/ui/Pagination';
import Select from '@/Components/ui/Select';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import { ArrowDown, ArrowUp, ArrowUpDown, Copy } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface ReeferRow {
    container: string;
    category: 'IMPRT' | 'EXPRT';
    transit_state: string;
    total_plugin_hours: number;
    total_connect_disconnect: number;
    line_op: string;
    type_iso: string;
    time_in: string;
    visit_index: number;
    total_visits: number;
}

interface Paginated<T> {
    data: T[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
}

interface Filters {
    date_from: string | null;
    date_to: string | null;
    category: 'both' | 'imprt' | 'exprt';
}

interface Props {
    rows: Paginated<ReeferRow>;
    filters: Filters;
    sort: string;
    direction: 'asc' | 'desc';
}

const COLUMNS: { key: string; label: string; align?: 'right' }[] = [
    { key: 'container', label: 'Container' },
    { key: 'category', label: 'Category' },
    { key: 'transit_state', label: 'Transit State' },
    { key: 'total_plugin_hours', label: 'Plug-in Hours', align: 'right' },
    { key: 'total_connect_disconnect', label: 'Connect/Disconnect', align: 'right' },
    { key: 'line_op', label: 'Line Operator' },
    { key: 'type_iso', label: 'ISO Type' },
];

export default function ReeferPluginReportIndex({ rows, filters, sort, direction }: Props) {
    const [localFrom, setLocalFrom] = useState(filters.date_from ?? '');
    const [localTo, setLocalTo] = useState(filters.date_to ?? '');
    const [localCategory, setLocalCategory] = useState(filters.category);

    const applyQuery = (overrides: Record<string, string | number | null>) => {
        router.get(
            '/operations/reefer-plugin-report/per-container',
            { ...filters, sort, direction, ...overrides, page: overrides.page ?? 1 },
            { preserveState: true, preserveScroll: true, only: ['rows', 'filters', 'sort', 'direction'] },
        );
    };

    const toggleSort = (column: string) => {
        applyQuery({ sort: column, direction: sort === column && direction === 'asc' ? 'desc' : 'asc' });
    };

    const handleApply = (e: FormEvent) => {
        e.preventDefault();
        applyQuery({ date_from: localFrom || null, date_to: localTo || null, category: localCategory });
    };

    return (
        <AppLayout>
            <Head title="Reefer Plug-in Report" />

            <PageHeader
                title="Reefer Plug-in Hours Report"
                description="Hours reefer containers have been plugged in at the terminal over a selected date range."
            />

            <Card className="mb-4 p-3">
                <form
                    onSubmit={handleApply}
                    className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
                >
                    <div>
                        <Label htmlFor="date_from">From</Label>
                        <Input id="date_from" type="date" value={localFrom} onChange={(e) => setLocalFrom(e.target.value)} />
                        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Required to run the report.</p>
                    </div>

                    <div>
                        <Label htmlFor="date_to">To</Label>
                        <Input id="date_to" type="date" value={localTo} onChange={(e) => setLocalTo(e.target.value)} />
                        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Defaults to today if left blank.</p>
                    </div>

                    <div>
                        <Label htmlFor="category">Category</Label>
                        <Select
                            id="category"
                            value={localCategory}
                            onChange={(e) => setLocalCategory(e.target.value as Filters['category'])}
                        >
                            <option value="both">Both</option>
                            <option value="imprt">Import only</option>
                            <option value="exprt">Export only</option>
                        </Select>
                    </div>

                    <Button type="submit" variant="primary">
                        Apply
                    </Button>
                </form>
            </Card>

            <div className="mb-3 flex items-end gap-2 sm:hidden">
                <div className="flex-1">
                    <Label htmlFor="mobile_sort">Sort by</Label>
                    <Select id="mobile_sort" value={sort} onChange={(e) => toggleSort(e.target.value)}>
                        {COLUMNS.map((col) => (
                            <option key={col.key} value={col.key}>
                                {col.label}
                            </option>
                        ))}
                    </Select>
                </div>
                <button
                    type="button"
                    onClick={() => applyQuery({ direction: direction === 'asc' ? 'desc' : 'asc' })}
                    aria-label="Toggle sort direction"
                    className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-md border border-slate-300 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                    {direction === 'asc' ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
                </button>
            </div>

            <div className="space-y-3 sm:hidden">
                {rows.data.map((row, i) => (
                    <Card key={`${row.container}-${i}`} className="p-3">
                        <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 font-mono text-xs font-medium text-slate-900 dark:text-white">
                                {row.container}
                                {row.total_visits > 1 && (
                                    <Badge tone="blue">
                                        <Copy className="mr-0.5 size-2.5" />
                                        {row.visit_index}/{row.total_visits}
                                    </Badge>
                                )}
                            </span>
                            <Badge tone={row.category === 'IMPRT' ? 'neutral' : 'green'}>{row.category}</Badge>
                        </div>
                        <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                            <dt className="text-slate-400 dark:text-slate-500">Transit State</dt>
                            <dd className="text-right text-slate-600 dark:text-slate-300">{row.transit_state}</dd>
                            <dt className="text-slate-400 dark:text-slate-500">Plug-in Hours</dt>
                            <dd className="text-right tabular-nums text-slate-900 dark:text-white">{row.total_plugin_hours.toFixed(2)}</dd>
                            <dt className="text-slate-400 dark:text-slate-500">Connect/Disconnect</dt>
                            <dd className="text-right tabular-nums text-slate-600 dark:text-slate-300">{row.total_connect_disconnect}</dd>
                            <dt className="text-slate-400 dark:text-slate-500">Line Operator</dt>
                            <dd className="text-right text-slate-600 dark:text-slate-300">{row.line_op}</dd>
                            <dt className="text-slate-400 dark:text-slate-500">ISO Type</dt>
                            <dd className="text-right text-slate-600 dark:text-slate-300">{row.type_iso}</dd>
                        </dl>
                    </Card>
                ))}

                {rows.data.length === 0 && !filters.date_from && (
                    <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-600">Select a "From" date above to run the report.</p>
                )}

                {rows.data.length === 0 && filters.date_from && (
                    <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-600">No results for the selected filters.</p>
                )}

                <Pagination links={rows.links} from={rows.from} to={rows.to} total={rows.total} />
            </div>

            <Card className="hidden overflow-hidden sm:block">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800">
                                {COLUMNS.map((col) => (
                                    <th key={col.key} className={col.align === 'right' ? 'text-right' : 'text-left'}>
                                        <button
                                            type="button"
                                            onClick={() => toggleSort(col.key)}
                                            className={`inline-flex items-center gap-1 px-4 py-2.5 text-xs font-semibold whitespace-nowrap text-slate-500 uppercase hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 ${col.align === 'right' ? 'flex-row-reverse' : ''}`}
                                        >
                                            {col.label}
                                            {sort === col.key ? (
                                                direction === 'asc' ? (
                                                    <ArrowUp className="size-3" />
                                                ) : (
                                                    <ArrowDown className="size-3" />
                                                )
                                            ) : (
                                                <ArrowUpDown className="size-3 text-slate-300 dark:text-slate-700" />
                                            )}
                                        </button>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {rows.data.map((row, i) => (
                                <tr key={`${row.container}-${i}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-4 py-2.5 font-mono text-xs font-medium whitespace-nowrap text-slate-900 dark:text-white">
                                        <span className="inline-flex items-center gap-1.5">
                                            {row.container}
                                            {row.total_visits > 1 && (
                                                <span
                                                    title={`Plugged in ${row.total_visits} times in this range (visit ${row.visit_index} of ${row.total_visits})`}
                                                    className="inline-flex items-center gap-0.5"
                                                >
                                                    <Badge tone="blue">
                                                        <Copy className="mr-0.5 size-2.5" />
                                                        {row.visit_index}/{row.total_visits}
                                                    </Badge>
                                                </span>
                                            )}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                        <Badge tone={row.category === 'IMPRT' ? 'neutral' : 'green'}>{row.category}</Badge>
                                    </td>
                                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">{row.transit_state}</td>
                                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-900 dark:text-white">
                                        {row.total_plugin_hours.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">
                                        {row.total_connect_disconnect}
                                    </td>
                                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">{row.line_op}</td>
                                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">{row.type_iso}</td>
                                </tr>
                            ))}

                            {rows.data.length === 0 && !filters.date_from && (
                                <tr>
                                    <td colSpan={COLUMNS.length} className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-600">
                                        Select a "From" date above to run the report.
                                    </td>
                                </tr>
                            )}

                            {rows.data.length === 0 && filters.date_from && (
                                <tr>
                                    <td colSpan={COLUMNS.length} className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-600">
                                        No results for the selected filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination links={rows.links} from={rows.from} to={rows.to} total={rows.total} />
            </Card>
        </AppLayout>
    );
}
