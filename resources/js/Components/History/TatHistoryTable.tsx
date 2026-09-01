import Badge from '@/Components/ui/Badge';
import Card from '@/Components/ui/Card';
import Pagination from '@/Components/ui/Pagination';
import { formatPH } from './formatters';
import { Paginated, TatHistoryRow } from './types';

const TAT_STATUS_LABELS: Record<string, string> = {
    precheck_to_outgate: 'Precheck To Outgate',
    ingate_to_outgate: 'Ingate To Outgate',
};

interface TatHistoryTableProps {
    rows: Paginated<TatHistoryRow>;
    showStatus?: boolean;
    emptyMessage: string;
}

export default function TatHistoryTable({ rows, showStatus = false, emptyMessage }: TatHistoryTableProps) {
    if (rows.data.length === 0) {
        return (
            <Card className="overflow-hidden">
                <p className="p-6 text-sm text-slate-400 dark:text-slate-600">{emptyMessage}</p>
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800">
                            <th className="px-4 py-2.5 text-xs font-semibold whitespace-nowrap text-slate-500 uppercase dark:text-slate-400">Shift</th>
                            <th className="px-4 py-2.5 text-xs font-semibold whitespace-nowrap text-slate-500 uppercase dark:text-slate-400">
                                Shift Start
                            </th>
                            <th className="px-4 py-2.5 text-xs font-semibold whitespace-nowrap text-slate-500 uppercase dark:text-slate-400">
                                Shift End
                            </th>
                            {showStatus && (
                                <th className="px-4 py-2.5 text-xs font-semibold whitespace-nowrap text-slate-500 uppercase dark:text-slate-400">
                                    Type
                                </th>
                            )}
                            <th className="px-4 py-2.5 text-xs font-semibold whitespace-nowrap text-slate-500 uppercase dark:text-slate-400">
                                Avg TAT
                            </th>
                            <th className="px-4 py-2.5 text-xs font-semibold whitespace-nowrap text-slate-500 uppercase dark:text-slate-400">
                                Seconds
                            </th>
                            <th className="px-4 py-2.5 text-xs font-semibold whitespace-nowrap text-slate-500 uppercase dark:text-slate-400">
                                Containers
                            </th>
                            <th className="px-4 py-2.5 text-xs font-semibold whitespace-nowrap text-slate-500 uppercase dark:text-slate-400">
                                Recorded At
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {rows.data.map((row) => (
                            <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="px-4 py-2.5 whitespace-nowrap">
                                    <Badge tone={row.shift_label === 'Day Shift' ? 'amber' : 'blue'}>{row.shift_label}</Badge>
                                </td>
                                <td className="px-4 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">{formatPH(row.shift_start)}</td>
                                <td className="px-4 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">{formatPH(row.shift_end)}</td>
                                {showStatus && (
                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                        <Badge tone={row.status === 'precheck_to_outgate' ? 'neutral' : 'green'}>
                                            {row.status ? (TAT_STATUS_LABELS[row.status] ?? row.status) : '—'}
                                        </Badge>
                                    </td>
                                )}
                                <td className="px-4 py-2.5 font-medium whitespace-nowrap text-slate-900 dark:text-white">
                                    {row.avg_tat ?? '—'}
                                </td>
                                <td className="px-4 py-2.5 tabular-nums whitespace-nowrap text-slate-600 dark:text-slate-300">
                                    {row.avg_tat_seconds}
                                </td>
                                <td className="px-4 py-2.5 tabular-nums whitespace-nowrap text-slate-600 dark:text-slate-300">
                                    {row.container_count ?? '—'}
                                </td>
                                <td className="px-4 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">{formatPH(row.recorded_at)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Pagination links={rows.links} from={rows.from} to={rows.to} total={rows.total} />
        </Card>
    );
}
