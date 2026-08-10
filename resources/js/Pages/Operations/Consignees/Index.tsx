import PageHeader from '@/Components/PageHeader';
import CsvExportButton from '@/Components/History/CsvExportButton';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import Input from '@/Components/ui/Input';
import AppLayout from '@/Layouts/AppLayout';
import { cn } from '@/lib/utils';
import { Head, router } from '@inertiajs/react';
import { ArrowDown, ArrowUp, ArrowUpDown, Check, ChevronLeft, ChevronRight, Copy, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';

function buildExportUrl(base: string, params: Record<string, string | null>) {
    const qs = Object.entries(params)
        .filter(([, v]) => v)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`)
        .join('&');
    return qs ? `${base}?${qs}` : base;
}

interface ConsigneeRow {
    customer_id: string;
    customer_name: string;
}

interface Props {
    rows: ConsigneeRow[];
}

type SortKey = keyof ConsigneeRow;

const COLUMNS: { key: SortKey; label: string }[] = [
    { key: 'customer_id', label: 'Customer ID' },
    { key: 'customer_name', label: 'Customer Name' },
];

const PER_PAGE = 25;

export default function ConsigneesIndex({ rows }: Props) {
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<SortKey>('customer_id');
    const [direction, setDirection] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(1);
    const [refreshing, setRefreshing] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const refresh = () => {
        router.reload({
            only: ['rows'],
            onStart: () => setRefreshing(true),
            onFinish: () => setRefreshing(false),
        });
    };

    const copyRow = async (row: ConsigneeRow) => {
        try {
            await navigator.clipboard.writeText(`${row.customer_id} - ${row.customer_name}`);
            setCopiedId(row.customer_id);
            setTimeout(() => setCopiedId((id) => (id === row.customer_id ? null : id)), 1500);
        } catch {
            alert('Copy failed. Please try again.');
        }
    };

    const filteredSorted = useMemo(() => {
        const needle = search.trim().toLowerCase();

        const filtered = needle
            ? rows.filter(
                  (row) => row.customer_id.toLowerCase().includes(needle) || row.customer_name.toLowerCase().includes(needle),
              )
            : rows;

        const sorted = [...filtered].sort((a, b) => {
            const result = a[sort].localeCompare(b[sort]);
            return direction === 'asc' ? result : -result;
        });

        return sorted;
    }, [rows, search, sort, direction]);

    const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PER_PAGE));
    const currentPage = Math.min(page, totalPages);
    const pageRows = filteredSorted.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
    const from = filteredSorted.length === 0 ? null : (currentPage - 1) * PER_PAGE + 1;
    const to = filteredSorted.length === 0 ? null : Math.min(currentPage * PER_PAGE, filteredSorted.length);

    const exportUrl = buildExportUrl('/operations/consignees/export', {
        search: search || null,
        sort,
        direction,
    });

    const toggleSort = (column: SortKey) => {
        setDirection(sort === column && direction === 'asc' ? 'desc' : 'asc');
        setSort(column);
        setPage(1);
    };

    return (
        <AppLayout>
            <Head title="Consignees" />

            <PageHeader
                title="Consignees"
                description="Consignee/customer reference list."
                actions={
                    <div className="flex items-center gap-2">
                        <Button type="button" variant="secondary" onClick={refresh} disabled={refreshing}>
                            <RefreshCw className={cn('size-3.5', refreshing && 'animate-spin')} />
                            {refreshing ? 'Refreshing…' : 'Refresh'}
                        </Button>
                        <CsvExportButton url={exportUrl} filename="consignees.xlsx" />
                    </div>
                }
            />

            <Card className="mb-4 p-3">
                <Input
                    id="search"
                    type="text"
                    placeholder="Search by customer ID or name"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                />
            </Card>

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800">
                                {COLUMNS.map((column) => (
                                    <th
                                        key={column.key}
                                        className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap text-slate-500 uppercase dark:text-slate-400"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => toggleSort(column.key)}
                                            className="inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200"
                                        >
                                            {column.label}
                                            {sort === column.key ? (
                                                direction === 'asc' ? (
                                                    <ArrowUp className="size-3" />
                                                ) : (
                                                    <ArrowDown className="size-3" />
                                                )
                                            ) : (
                                                <ArrowUpDown className="size-3 opacity-40" />
                                            )}
                                        </button>
                                    </th>
                                ))}
                                <th className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap text-slate-500 uppercase dark:text-slate-400">
                                    Copy
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {pageRows.map((row) => (
                                <tr key={row.customer_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-4 py-2.5 font-medium whitespace-nowrap text-slate-900 dark:text-white">{row.customer_id}</td>
                                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{row.customer_name}</td>
                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => copyRow(row)}
                                            aria-label="Copy to clipboard"
                                        >
                                            {copiedId === row.customer_id ? (
                                                <Check className="size-3.5 text-green-600" />
                                            ) : (
                                                <Copy className="size-3.5" />
                                            )}
                                        </Button>
                                    </td>
                                </tr>
                            ))}

                            {pageRows.length === 0 && (
                                <tr>
                                    <td colSpan={COLUMNS.length + 1} className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-600">
                                        No consignees found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {filteredSorted.length > 0 && (
                    <div className="flex flex-col gap-2.5 border-t border-slate-200 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Showing <span className="font-medium text-slate-700 dark:text-slate-300">{from}</span>&ndash;
                            <span className="font-medium text-slate-700 dark:text-slate-300">{to}</span> of{' '}
                            <span className="font-medium text-slate-700 dark:text-slate-300">{filteredSorted.length}</span>
                        </p>

                        <div className="flex items-center gap-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={currentPage <= 1}
                                onClick={() => setPage(currentPage - 1)}
                                aria-label="Previous page"
                            >
                                <ChevronLeft className="size-3.5" />
                            </Button>
                            <span className="px-1.5 text-xs text-slate-500 dark:text-slate-400">
                                Page {currentPage} of {totalPages}
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={currentPage >= totalPages}
                                onClick={() => setPage(currentPage + 1)}
                                aria-label="Next page"
                            >
                                <ChevronRight className="size-3.5" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </AppLayout>
    );
}
