import PageHeader from '@/Components/PageHeader';
import Card from '@/Components/ui/Card';
import CsvExportButton from '@/Components/History/CsvExportButton';
import HighElapsedTransactionsTable from '@/Components/History/HighElapsedTransactionsTable';
import HistoryFilterBar, { FilterField } from '@/Components/History/HistoryFilterBar';
import TatHistoryTable from '@/Components/History/TatHistoryTable';
import { HighElapsedTransactionRow, Paginated, TatHistoryRow } from '@/Components/History/types';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

interface Filters {
    tat_shift: string | null;
    tat_from: string | null;
    tat_to: string | null;
    tx_container: string | null;
    tx_category: string | null;
}

interface Props {
    tatHistory: Paginated<TatHistoryRow>;
    transactions: Paginated<HighElapsedTransactionRow>;
    filters: Filters;
}

const TAT_FIELDS: FilterField[] = [
    {
        type: 'select',
        name: 'tat_shift',
        label: 'Shift',
        options: [
            { value: '', label: 'All Shifts' },
            { value: 'Day Shift', label: 'Day Shift' },
            { value: 'Night Shift', label: 'Night Shift' },
        ],
    },
    { type: 'date', name: 'tat_from', label: 'From Date' },
    { type: 'date', name: 'tat_to', label: 'To Date' },
];

const TX_FIELDS: FilterField[] = [
    { type: 'text', name: 'tx_container', label: 'Container', placeholder: 'e.g. TCKU1234567' },
    {
        type: 'select',
        name: 'tx_category',
        label: 'Category',
        options: [
            { value: '', label: 'All' },
            { value: 'STRGE', label: 'STRGE' },
        ],
    },
];

function buildQuery(filters: Filters, overrides: Partial<Filters>): Record<string, string> {
    const merged = { ...filters, ...overrides };
    return Object.fromEntries(Object.entries(merged).filter(([, v]) => v)) as Record<string, string>;
}

function buildExportUrl(base: string, params: Record<string, string | null>) {
    const qs = Object.entries(params)
        .filter(([, v]) => v)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`)
        .join('&');
    return qs ? `${base}?${qs}` : base;
}

export default function RoadQueueEcdHistory({ tatHistory, transactions, filters }: Props) {
    const [tatValues, setTatValues] = useState({
        tat_shift: filters.tat_shift ?? '',
        tat_from: filters.tat_from ?? '',
        tat_to: filters.tat_to ?? '',
    });
    const [txValues, setTxValues] = useState({
        tx_container: filters.tx_container ?? '',
        tx_category: filters.tx_category ?? '',
    });

    const applyTat = () => {
        router.get('/operations/road-queue-ecd/history', buildQuery(filters, tatValues), { preserveState: true, preserveScroll: true });
    };

    const resetTat = () => {
        const cleared = { tat_shift: '', tat_from: '', tat_to: '' };
        setTatValues(cleared);
        router.get('/operations/road-queue-ecd/history', buildQuery(filters, cleared), { preserveState: true, preserveScroll: true });
    };

    const applyTx = () => {
        router.get('/operations/road-queue-ecd/history', buildQuery(filters, txValues), { preserveState: true, preserveScroll: true });
    };

    const resetTx = () => {
        const cleared = { tx_container: '', tx_category: '' };
        setTxValues(cleared);
        router.get('/operations/road-queue-ecd/history', buildQuery(filters, cleared), { preserveState: true, preserveScroll: true });
    };

    const tatExportUrl = buildExportUrl('/operations/road-queue-ecd/history/export/tat', {
        tat_shift: filters.tat_shift,
        tat_from: filters.tat_from,
        tat_to: filters.tat_to,
    });
    const txExportUrl = buildExportUrl('/operations/road-queue-ecd/history/export/transactions', {
        tx_container: filters.tx_container,
        tx_category: filters.tx_category,
    });

    return (
        <AppLayout>
            <Head title="Road Queue (ECD) History" />

            <PageHeader
                title="Road Queue (ECD) — History"
                description="Shift TAT averages and containers that spent 1 hour or more in the empty-container-depot road queue."
            />

            <div className="space-y-8">
                <section>
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                        <div>
                            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Previous Shift TAT History</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Average turnaround time snapshots per shift.</p>
                        </div>
                        <CsvExportButton url={tatExportUrl} filename="road_queue_ecd_tat_history.csv" />
                    </div>

                    <Card className="mb-3 overflow-hidden">
                        <HistoryFilterBar
                            fields={TAT_FIELDS}
                            values={tatValues}
                            onChange={(name, value) => setTatValues((prev) => ({ ...prev, [name]: value }))}
                            onSubmit={applyTat}
                            onReset={resetTat}
                            hasActiveFilters={!!(filters.tat_shift || filters.tat_from || filters.tat_to)}
                        />
                    </Card>

                    <TatHistoryTable
                        rows={tatHistory}
                        emptyMessage={
                            filters.tat_shift || filters.tat_from || filters.tat_to
                                ? 'No records match the current filters.'
                                : 'No TAT history recorded yet. Snapshots are captured automatically on each board load.'
                        }
                    />
                </section>

                <section>
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                        <div>
                            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Transactions ≥ 1 Hour Elapsed</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Containers that spent 1 hour or more in the road queue.</p>
                        </div>
                        <CsvExportButton url={txExportUrl} filename="road_queue_ecd_high_elapsed_transactions.csv" />
                    </div>

                    <Card className="mb-3 overflow-hidden">
                        <HistoryFilterBar
                            fields={TX_FIELDS}
                            values={txValues}
                            onChange={(name, value) => setTxValues((prev) => ({ ...prev, [name]: value }))}
                            onSubmit={applyTx}
                            onReset={resetTx}
                            hasActiveFilters={!!(filters.tx_container || filters.tx_category)}
                        />
                    </Card>

                    <HighElapsedTransactionsTable
                        rows={transactions}
                        dateColumn={{ key: 'truck_visit_entered_yard', label: 'Truck Entered Yard' }}
                        showTruckingCompany
                        emptyMessage={
                            filters.tx_container || filters.tx_category
                                ? 'No transactions match the current filters.'
                                : 'No transactions recorded yet. Containers with elapsed time ≥ 1 hour are captured automatically.'
                        }
                    />
                </section>
            </div>
        </AppLayout>
    );
}
