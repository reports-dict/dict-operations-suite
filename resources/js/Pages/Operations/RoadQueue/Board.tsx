import QueueCard, { QueueCardField } from '@/Components/QueueCard';
import RoadQueueCountdown from '@/Components/RoadQueueCountdown';
import AppLayout from '@/Layouts/AppLayout';
import { SharedProps } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { ReactNode, useEffect, useMemo, useState } from 'react';

interface RoadQueueRow {
    container: string;
    category: 'IMPRT' | 'EXPRT';
    precheck_time: string | null;
    elapsed_time: string | null;
    ingate_time: string | null;
    ingate_elapsed_time: string | null;
    assigned_che: string | null;
    type_iso: string | null;
    ob_carrier: string | null;
    freight_kind: string | null;
    line_op: string | null;
    pos_slot_from: string | null;
    pos_slot: string | null;
    bat_nbr: string | null;
}

interface Props {
    roadQueues?: RoadQueueRow[];
    error?: string | null;
    debug_error?: string | null;
    tatPrecheckToOutgate?: string | null;
    tatIngateToOutgate?: string | null;
    shiftLabel?: string | null;
    shiftRange?: string | null;
}

const COLUMNS: { key: keyof RoadQueueRow; label: string }[] = [
    { key: 'container', label: 'Container' },
    { key: 'category', label: 'Category' },
    { key: 'precheck_time', label: 'Precheck Time' },
    { key: 'elapsed_time', label: 'Precheck Elapsed Time' },
    { key: 'ingate_time', label: 'Ingate Time' },
    { key: 'ingate_elapsed_time', label: 'Ingate Elapsed Time' },
    { key: 'assigned_che', label: 'Assigned CHE' },
    { key: 'type_iso', label: 'ISO Type' },
    { key: 'ob_carrier', label: 'O/B CARRIER' },
    { key: 'freight_kind', label: 'F.Kind' },
    { key: 'line_op', label: 'Line Op' },
    { key: 'pos_slot_from', label: 'FROM' },
    { key: 'pos_slot', label: 'TO' },
    { key: 'bat_nbr', label: 'BAT#' },
];

function getFreightKindColor(value: string | null) {
    if (value === 'MTY') return 'bg-violet-100 text-violet-800 font-semibold';
    if (value === 'FCL') return 'bg-red-100 text-red-800 font-semibold';
    return '';
}

function getCategoryColor(value: string | null) {
    if (value === 'EXPRT') return 'bg-cyan-600 text-white font-semibold';
    if (value === 'IMPRT') return 'bg-red-600 text-white font-semibold';
    return '';
}

function isElapsedTimeGreaterOrEqualOneHour(elapsedTimeStr: string | null) {
    if (!elapsedTimeStr) return false;
    const dayMatch = elapsedTimeStr.match(/(\d+)D/);
    const hourMatch = elapsedTimeStr.match(/(\d+)H/);
    const days = dayMatch ? parseInt(dayMatch[1]) : 0;
    const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
    return days > 0 || hours >= 1;
}

function isElapsedTimeGreaterOrEqualThirtyMinutes(elapsedTimeStr: string | null) {
    if (!elapsedTimeStr) return false;
    const dayMatch = elapsedTimeStr.match(/(\d+)D/);
    const hourMatch = elapsedTimeStr.match(/(\d+)H/);
    const minuteMatch = elapsedTimeStr.match(/(\d+)M/);
    const days = dayMatch ? parseInt(dayMatch[1]) : 0;
    const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
    const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;
    return days > 0 || hours >= 1 || minutes >= 30;
}

function formatDateTime(value: string | null) {
    if (!value) return '-';
    try {
        return new Date(value).toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        });
    } catch {
        return value;
    }
}

// Card view (below lg:) shows these at a glance; everything else in
// COLUMNS goes behind the "Show Details" toggle. Derived from COLUMNS
// rather than re-typed so labels can't drift between the table and cards.
const PRIMARY_KEYS: (keyof RoadQueueRow)[] = ['container', 'category', 'elapsed_time', 'bat_nbr'];

const CARD_FIELD_RENDERERS: Partial<Record<keyof RoadQueueRow, (row: RoadQueueRow) => ReactNode>> = {
    container: (row) => (
        <span className={`rounded-md px-2 py-1 ${getCategoryColor(row.category)}`}>{row.container}</span>
    ),
    category: (row) => <span className={`rounded-md px-2 py-1 text-xs ${getCategoryColor(row.category)}`}>{row.category}</span>,
    freight_kind: (row) => <span className={`rounded-md px-2 py-1 ${getFreightKindColor(row.freight_kind)}`}>{row.freight_kind || '-'}</span>,
    precheck_time: (row) => formatDateTime(row.precheck_time),
    ingate_time: (row) => formatDateTime(row.ingate_time),
};

function toCardField(col: (typeof COLUMNS)[number]): QueueCardField<RoadQueueRow> {
    return { key: col.key, label: col.label, render: CARD_FIELD_RENDERERS[col.key] };
}

const PRIMARY_FIELDS = PRIMARY_KEYS.map((key) => toCardField(COLUMNS.find((c) => c.key === key)!));
const SECONDARY_FIELDS = COLUMNS.filter((c) => !PRIMARY_KEYS.includes(c.key)).map(toCardField);

const getRowKey = (item: RoadQueueRow, idx: number) => item.bat_nbr || `${item.container}-${idx}`;

export default function RoadQueueBoard({
    roadQueues = [],
    error = null,
    debug_error = null,
    tatPrecheckToOutgate = null,
    tatIngateToOutgate = null,
    shiftLabel = null,
    shiftRange = null,
}: Props) {
    const { auth } = usePage<SharedProps>().props;
    const [sortField, setSortField] = useState<keyof RoadQueueRow | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [lastUpdated] = useState(new Date());
    const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(60);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

    const toggleExpanded = (key: string) => {
        setExpandedKeys((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    useEffect(() => {
        const timer = setInterval(() => {
            router.reload({ preserveScroll: true });
        }, 60000);

        const countdownTimer = setInterval(() => {
            setSecondsUntilRefresh((prev) => (prev <= 1 ? 60 : prev - 1));
        }, 1000);

        const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFullscreenChange);

        const stopStart = router.on('start', () => setFetching(true));
        const stopFinish = router.on('finish', () => setFetching(false));

        return () => {
            clearInterval(timer);
            clearInterval(countdownTimer);
            document.removeEventListener('fullscreenchange', onFullscreenChange);
            stopStart();
            stopFinish();
        };
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const handleSort = (field: keyof RoadQueueRow) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handleRefresh = () => router.reload({ preserveScroll: true });

    const formatTime = (date: Date) =>
        date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    const sortedData = useMemo(() => {
        if (!sortField) return roadQueues;

        return [...roadQueues].sort((a, b) => {
            const aValue = a[sortField] || '';
            const bValue = b[sortField] || '';
            const aNum = parseFloat(aValue as string);
            const bNum = parseFloat(bValue as string);
            const comparison =
                !isNaN(aNum) && !isNaN(bNum) ? aNum - bNum : String(aValue).localeCompare(String(bValue));
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [roadQueues, sortField, sortDirection]);

    const showSidebar = auth.user && !isFullscreen;
    const contentMinHeight = showSidebar ? '' : 'min-h-screen ';

    let content: ReactNode;

    const tatBanner = (
        <div className="mb-2 rounded border border-indigo-200 bg-indigo-50 p-3 shadow">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <span className="text-sm font-semibold tracking-wide text-indigo-700 uppercase">
                        Previous Shift TAT — {shiftLabel ?? '—'}
                    </span>
                    <p className="mt-0.5 text-xs text-indigo-500">{shiftRange ?? '—'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                    <div className="text-right">
                        <div className="text-xs font-semibold tracking-wide text-indigo-500 uppercase">Precheck To Outgate</div>
                        <div className="text-xl font-bold text-indigo-900 sm:text-2xl lg:text-3xl">{tatPrecheckToOutgate ?? 'No data'}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs font-semibold tracking-wide text-indigo-500 uppercase">Ingate To Outgate</div>
                        <div className="text-xl font-bold text-indigo-900 sm:text-2xl lg:text-3xl">{tatIngateToOutgate ?? 'No data'}</div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (error) {
        content = (
            <div className={`${contentMinHeight}bg-red-50 px-1 py-2 sm:px-2 lg:px-3`}>
                <div className="w-full">
                    <div className="rounded border-2 border-red-400 bg-red-100 p-4">
                        <h1 className="mb-2 text-lg font-bold text-red-800 sm:text-xl lg:text-2xl">
                            ⚠ Connection Error — Auto-retrying in {secondsUntilRefresh}s
                        </h1>
                        <p className="mb-2 text-base text-red-700">Unable to connect to the database. The page will automatically retry.</p>
                        {debug_error && (
                            <details className="mt-2 rounded border border-red-200 bg-white p-2 text-sm text-red-600">
                                <summary className="cursor-pointer font-semibold">Debug Information</summary>
                                <pre className="mt-1 overflow-auto text-xs">{debug_error}</pre>
                            </details>
                        )}
                        <button
                            onClick={handleRefresh}
                            className="mt-2 rounded bg-red-600 px-3 py-1 text-base font-bold text-white hover:bg-red-700"
                        >
                            Retry Now
                        </button>
                    </div>
                </div>
            </div>
        );
    } else if (roadQueues.length === 0) {
        content = (
            <div className={`${contentMinHeight}bg-gray-50 px-1 py-2 sm:px-2 lg:px-3`}>
                <div className="w-full">
                    {tatBanner}
                    <div className="rounded border border-yellow-200 bg-yellow-50 p-3">
                        <h1 className="mb-2 text-base font-bold text-yellow-800 sm:text-lg lg:text-xl">
                            No active gate transactions as of the last refresh time. Next refresh in {secondsUntilRefresh}s.
                        </h1>
                        <button
                            onClick={handleRefresh}
                            className="mt-2 rounded bg-yellow-600 px-3 py-1 text-base font-bold text-white hover:bg-yellow-700"
                        >
                            Refresh
                        </button>
                    </div>
                </div>
            </div>
        );
    } else {
        content = (
            <>
                <Head title="XPS Road Queue Terminal" />
                <div className={`${contentMinHeight}bg-gray-50 px-1 py-2 sm:px-2 lg:px-3`}>
                    <div className="w-full">
                        <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 sm:text-2xl lg:text-3xl">XPS Road Queue Terminal</h1>
                                <p className="mt-1 text-gray-600">View and manage planned deliveries and receipts</p>
                            </div>
                            <div className="flex flex-shrink-0 items-center gap-2 sm:gap-4">
                                <div className="text-right text-[11px] leading-snug sm:text-sm">
                                    <div>
                                        <span className="font-semibold text-blue-700">Last Updated: </span>
                                        <span className="text-blue-600">{formatTime(lastUpdated)}</span>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-blue-700">Next Refresh: </span>
                                        <span className="font-semibold text-blue-600">{secondsUntilRefresh}s</span>
                                    </div>
                                </div>
                                <button
                                    onClick={toggleFullscreen}
                                    className="flex items-center gap-1.5 rounded bg-gray-800 px-2 py-1 text-xs font-semibold text-white shadow transition hover:bg-gray-700 sm:px-3 sm:py-1.5 sm:text-sm"
                                >
                                    {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                                </button>
                            </div>
                        </div>

                        <RoadQueueCountdown secondsRemaining={secondsUntilRefresh} fetching={fetching} />

                        {tatBanner}

                        <div className="mb-1 text-sm text-gray-600">Showing {sortedData.length} of {roadQueues.length} records</div>

                        <div className="hidden overflow-hidden rounded-lg bg-white shadow lg:block">
                            <div className="overflow-x-auto">
                                <table className="w-full divide-y divide-gray-200">
                                    <thead className="border-b-2 border-gray-300 bg-gray-100">
                                        <tr>
                                            <th className="w-8 px-1 py-1 text-left text-xs font-bold tracking-tight text-gray-700 uppercase sm:text-base lg:text-xl">
                                                #
                                            </th>
                                            {COLUMNS.map((col) => (
                                                <th
                                                    key={col.key}
                                                    className="cursor-pointer px-1 py-1 text-left text-xs font-bold tracking-tight text-gray-700 uppercase transition hover:bg-gray-200 sm:text-base lg:text-xl"
                                                    onClick={() => handleSort(col.key)}
                                                >
                                                    <div className="flex items-center">
                                                        {col.label}
                                                        {sortField === col.key && <span className="ml-2">{sortDirection === 'asc' ? '▲' : '▼'}</span>}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {sortedData.map((item, idx) => {
                                            const rowOverdue = isElapsedTimeGreaterOrEqualOneHour(item.elapsed_time);
                                            const rowWarning = !rowOverdue && isElapsedTimeGreaterOrEqualThirtyMinutes(item.ingate_elapsed_time);
                                            return (
                                            <tr
                                                key={idx}
                                                className={`transition duration-150 ${
                                                    rowOverdue
                                                        ? 'bg-red-200 hover:bg-red-300'
                                                        : rowWarning
                                                          ? 'bg-yellow-200 hover:bg-yellow-300'
                                                          : 'hover:bg-blue-50'
                                                }`}
                                            >
                                                <td className="w-8 bg-gray-50 px-1 py-1 text-xs font-bold text-gray-700 sm:text-base lg:text-xl">
                                                    {idx + 1}
                                                </td>
                                                {COLUMNS.map((col) => (
                                                    <td
                                                        key={col.key}
                                                        className={`px-1 py-1 text-xs font-bold whitespace-nowrap sm:text-base lg:text-xl ${
                                                            col.key === 'freight_kind'
                                                                ? `${getFreightKindColor(item.freight_kind)} rounded-md px-3 py-2`
                                                                : col.key === 'container' || col.key === 'category'
                                                                  ? `${getCategoryColor(item.category)} rounded-md px-3 py-2`
                                                                  : col.key === 'pos_slot_from' || col.key === 'pos_slot'
                                                                    ? 'font-bold text-gray-900'
                                                                    : 'text-gray-900'
                                                        }`}
                                                    >
                                                        {col.key === 'precheck_time'
                                                            ? formatDateTime(item.precheck_time)
                                                            : col.key === 'ingate_time'
                                                              ? formatDateTime(item.ingate_time)
                                                              : item[col.key] || '-'}
                                                    </td>
                                                ))}
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 lg:hidden">
                            {sortedData.map((item, idx) => {
                                const key = getRowKey(item, idx);
                                return (
                                    <QueueCard
                                        key={key}
                                        index={idx}
                                        row={item}
                                        primaryFields={PRIMARY_FIELDS}
                                        secondaryFields={SECONDARY_FIELDS}
                                        highlighted={isElapsedTimeGreaterOrEqualOneHour(item.elapsed_time)}
                                        warning={
                                            !isElapsedTimeGreaterOrEqualOneHour(item.elapsed_time) &&
                                            isElapsedTimeGreaterOrEqualThirtyMinutes(item.ingate_elapsed_time)
                                        }
                                        expanded={expandedKeys.has(key)}
                                        onToggleExpanded={() => toggleExpanded(key)}
                                    />
                                );
                            })}
                        </div>

                        <div className="mt-1 text-center text-xs text-gray-500">
                            <p>Click column headers to sort • Auto-refresh every 60 seconds</p>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return showSidebar ? <AppLayout>{content}</AppLayout> : content;
}
