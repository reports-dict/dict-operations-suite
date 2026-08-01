import PageHeader from '@/Components/PageHeader';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import Input from '@/Components/ui/Input';
import Label from '@/Components/ui/Label';
import Select from '@/Components/ui/Select';
import AppLayout from '@/Layouts/AppLayout';
import { cn } from '@/lib/utils';
import { Head, router } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

interface CategoryRow {
    category: 'IMPRT' | 'EXPRT';
    total_containers: number;
    total_connect_disconnect: number;
    total_plugin_hours: number;
}

interface Filters {
    date_from: string | null;
    date_to: string | null;
    category: 'both' | 'imprt' | 'exprt';
}

interface Props {
    rows: CategoryRow[];
    filters: Filters;
}

/**
 * Snaps `anchorIso` back to the Saturday that starts its Saturday-Friday
 * week and returns that fixed 7-day range (the Friday six days later).
 */
function saturdayToFridayWeek(anchorIso: string) {
    const anchor = new Date(anchorIso + 'T00:00:00');
    const daysSinceSaturday = (anchor.getDay() - 6 + 7) % 7; // getDay(): Sun=0 ... Sat=6
    const start = new Date(anchor);
    start.setDate(start.getDate() - daysSinceSaturday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6); // Friday of that same week
    const toIso = (d: Date) => d.toISOString().slice(0, 10);

    return { date_from: toIso(start), date_to: toIso(end) };
}

function formatHoursMinutes(totalHours: number) {
    const totalMinutes = Math.round(totalHours * 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours.toLocaleString()} hrs ${minutes} min`;
}

export default function ReeferPluginPerCategory({ rows, filters }: Props) {
    const [mode, setMode] = useState<'manual' | 'week' | 'date'>('manual');
    const [manualFrom, setManualFrom] = useState(filters.date_from ?? '');
    const [manualTo, setManualTo] = useState(filters.date_to ?? '');
    const [weekAnchor, setWeekAnchor] = useState('');
    const [singleDate, setSingleDate] = useState('');
    const [localCategory, setLocalCategory] = useState(filters.category);
    const totalHours = rows.reduce((sum, row) => sum + row.total_plugin_hours, 0);

    const applyQuery = (overrides: Record<string, string | null>) => {
        router.get(
            '/operations/reefer-plugin-report/per-category',
            { ...filters, ...overrides },
            { preserveState: true, preserveScroll: true, only: ['rows', 'filters'] },
        );
    };

    const handleApply = (e: FormEvent) => {
        e.preventDefault();

        if (mode === 'manual') {
            applyQuery({ date_from: manualFrom || null, date_to: manualTo || null, category: localCategory });
        } else if (mode === 'week') {
            if (!weekAnchor) {
                return;
            }
            applyQuery({ ...saturdayToFridayWeek(weekAnchor), category: localCategory });
        } else {
            if (!singleDate) {
                return;
            }
            applyQuery({ date_from: singleDate, date_to: singleDate, category: localCategory });
        }
    };

    return (
        <AppLayout>
            <Head title="Reefer Plug-in Report - Per Category" />

            <PageHeader
                title="Reefer Plug-in Hours - Per Category"
                description="Totals aggregated by container category over a selected date range."
            />

            <Card className="mb-4 p-3">
                <div className="mb-3 inline-flex rounded-md border border-slate-200 p-0.5 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={() => setMode('manual')}
                        className={cn(
                            'rounded px-3 py-1.5 text-sm font-medium transition-colors',
                            mode === 'manual'
                                ? 'bg-green-600 text-white'
                                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                        )}
                    >
                        Manual dates
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('week')}
                        className={cn(
                            'rounded px-3 py-1.5 text-sm font-medium transition-colors',
                            mode === 'week'
                                ? 'bg-green-600 text-white'
                                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                        )}
                    >
                        By week
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('date')}
                        className={cn(
                            'rounded px-3 py-1.5 text-sm font-medium transition-colors',
                            mode === 'date'
                                ? 'bg-green-600 text-white'
                                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                        )}
                    >
                        By date
                    </button>
                </div>

                <form onSubmit={handleApply} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                    {mode === 'manual' ? (
                        <>
                            <div className="sm:min-w-0 sm:flex-1">
                                <Label htmlFor="date_from">From</Label>
                                <Input id="date_from" type="date" value={manualFrom} onChange={(e) => setManualFrom(e.target.value)} />
                                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Required to run the report.</p>
                            </div>

                            <div className="sm:min-w-0 sm:flex-1">
                                <Label htmlFor="date_to">To</Label>
                                <Input id="date_to" type="date" value={manualTo} onChange={(e) => setManualTo(e.target.value)} />
                                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Defaults to today if left blank.</p>
                            </div>
                        </>
                    ) : mode === 'week' ? (
                        <div className="sm:min-w-0 sm:flex-1">
                            <Label htmlFor="week_anchor">Any date in the week</Label>
                            <Input id="week_anchor" type="date" value={weekAnchor} onChange={(e) => setWeekAnchor(e.target.value)} />
                            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                                Fetches the Saturday&ndash;Friday week containing this date.
                            </p>
                        </div>
                    ) : (
                        <div className="sm:min-w-0 sm:flex-1">
                            <Label htmlFor="single_date">Date</Label>
                            <Input id="single_date" type="date" value={singleDate} onChange={(e) => setSingleDate(e.target.value)} />
                            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Fetches just this one day.</p>
                        </div>
                    )}

                    <div className="sm:min-w-0 sm:flex-1">
                        <Label htmlFor="category">Category</Label>
                        <Select id="category" value={localCategory} onChange={(e) => setLocalCategory(e.target.value as Filters['category'])}>
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

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800">
                                <th className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap text-slate-500 uppercase dark:text-slate-400">
                                    Category
                                </th>
                                <th className="px-4 py-2.5 text-right text-xs font-semibold whitespace-nowrap text-slate-500 uppercase dark:text-slate-400">
                                    Total Containers
                                </th>
                                <th className="px-4 py-2.5 text-right text-xs font-semibold whitespace-nowrap text-slate-500 uppercase dark:text-slate-400">
                                    Connect/Disconnect
                                </th>
                                <th className="px-4 py-2.5 text-right text-xs font-semibold whitespace-nowrap text-slate-500 uppercase dark:text-slate-400">
                                    Plug-in Hours
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {rows.map((row) => (
                                <tr key={row.category} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-4 py-2.5 font-medium whitespace-nowrap text-slate-900 dark:text-white">{row.category}</td>
                                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">
                                        {row.total_containers}
                                    </td>
                                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600 dark:text-slate-300">
                                        {row.total_connect_disconnect}
                                    </td>
                                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-900 dark:text-white">
                                        {row.total_plugin_hours.toFixed(2)}
                                    </td>
                                </tr>
                            ))}

                            {rows.length === 0 && !filters.date_from && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-600">
                                        Select a "From" date above to run the report.
                                    </td>
                                </tr>
                            )}

                            {rows.length === 0 && filters.date_from && (
                                <tr>
                                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-600">
                                        No data for the selected filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>

                        {rows.length > 0 && (
                            <tfoot>
                                <tr className="border-t-2 border-slate-300 font-semibold dark:border-slate-700">
                                    <td colSpan={3} className="px-4 py-2.5 text-right text-sm text-slate-700 dark:text-slate-300">
                                        Overall Total
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-sm tabular-nums text-slate-900 dark:text-white">
                                        {formatHoursMinutes(totalHours)}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </Card>
        </AppLayout>
    );
}
