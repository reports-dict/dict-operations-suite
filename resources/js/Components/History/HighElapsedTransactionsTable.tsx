import Badge from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import Pagination from '@/Components/ui/Pagination';
import { formatPH } from './formatters';
import { HighElapsedTransactionRow, Paginated } from './types';

const CATEGORY_TONE: Record<string, 'blue' | 'red' | 'neutral'> = {
    EXPRT: 'blue',
    IMPRT: 'red',
    STRGE: 'neutral',
};

interface HighElapsedTransactionsTableProps {
    rows: Paginated<HighElapsedTransactionRow>;
    dateColumn: { key: 'precheck_time' | 'truck_visit_entered_yard'; label: string };
    showTruckingCompany?: boolean;
    emptyMessage: string;
}

export default function HighElapsedTransactionsTable({
    rows,
    dateColumn,
    showTruckingCompany = false,
    emptyMessage,
}: HighElapsedTransactionsTableProps) {
    if (rows.data.length === 0) {
        return (
            <Card className="overflow-hidden">
                <p className="p-6 text-sm text-slate-400 dark:text-slate-600">{emptyMessage}</p>
            </Card>
        );
    }

    const columns = [
        { key: 'container', label: 'Container' },
        { key: 'category', label: 'Category' },
        { key: dateColumn.key, label: dateColumn.label },
        { key: 'elapsed_time', label: 'Elapsed Time' },
        { key: 'assigned_che', label: 'CHE' },
        { key: 'type_iso', label: 'ISO Type' },
        { key: 'ob_carrier', label: 'O/B Carrier' },
        ...(showTruckingCompany ? [{ key: 'trucking_company', label: 'Trucking Co.' }] : []),
        { key: 'freight_kind', label: 'F.Kind' },
        { key: 'line_op', label: 'Line Op' },
        { key: 'pos_slot_from', label: 'FROM' },
        { key: 'pos_slot', label: 'TO' },
        { key: 'bat_nbr', label: 'BAT#' },
        { key: 'first_captured_at', label: 'First Captured' },
        { key: 'last_seen_at', label: 'Last Seen' },
    ] as const;

    return (
        <Card className="overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800">
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className="px-4 py-2.5 text-xs font-semibold whitespace-nowrap text-slate-500 uppercase dark:text-slate-400"
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {rows.data.map((row) => (
                            <tr key={row.id} className="hover:bg-red-50/60 dark:hover:bg-red-500/5">
                                {columns.map((col) => {
                                    const value = (row as Record<string, unknown>)[col.key];

                                    if (col.key === 'category') {
                                        return (
                                            <td key={col.key} className="px-4 py-2.5 whitespace-nowrap">
                                                {value ? <Badge tone={CATEGORY_TONE[value as string] ?? 'neutral'}>{value as string}</Badge> : '—'}
                                            </td>
                                        );
                                    }

                                    if (col.key === 'elapsed_time') {
                                        return (
                                            <td key={col.key} className="px-4 py-2.5 font-medium whitespace-nowrap text-red-700 dark:text-red-400">
                                                {(value as string) ?? '—'}
                                            </td>
                                        );
                                    }

                                    if (col.key === dateColumn.key || col.key === 'first_captured_at' || col.key === 'last_seen_at') {
                                        return (
                                            <td key={col.key} className="px-4 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                                                {formatPH(value as string | null)}
                                            </td>
                                        );
                                    }

                                    return (
                                        <td key={col.key} className="px-4 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                                            {(value as string) || '—'}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Pagination links={rows.links} from={rows.from} to={rows.to} total={rows.total} />
        </Card>
    );
}
