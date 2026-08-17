import PageHeader from '@/Components/PageHeader';
import CsvExportButton from '@/Components/History/CsvExportButton';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import Input from '@/Components/ui/Input';
import Label from '@/Components/ui/Label';
import Select from '@/Components/ui/Select';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router } from '@inertiajs/react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

function buildExportUrl(base: string, params: Record<string, string | null>) {
    const qs = Object.entries(params)
        .filter(([, v]) => v)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v as string)}`)
        .join('&');
    return qs ? `${base}?${qs}` : base;
}

interface LogRow {
    employee_id: string;
    full_name: string;
    department: string;
    section: string;
    log_type: 'IN' | 'OUT' | '';
    log_datetime: string;
    location: string;
}

interface Filters {
    start_datetime: string | null;
    end_datetime: string | null;
    log_type: 'IN' | 'OUT' | null;
}

interface Props {
    rows: LogRow[];
    filters: Filters;
    error: string | null;
}

type SortKey = keyof LogRow;

const COLUMNS: { key: SortKey; label: string }[] = [
    { key: 'employee_id', label: 'Employee ID' },
    { key: 'full_name', label: 'Employee Name' },
    { key: 'department', label: 'Department' },
    { key: 'section', label: 'Section' },
    { key: 'log_type', label: 'Log Type' },
    { key: 'log_datetime', label: 'Log Date/Time' },
    { key: 'location', label: 'Location' },
];

const PER_PAGE = 25;

function splitDateTime(value: string | null): [string, string] {
    if (!value) return ['', ''];
    const [date, time] = value.split('T');
    return [date ?? '', time ?? ''];
}

export default function DriverAssignmentLogs({ rows, filters, error }: Props) {
    const [initialStartDate, initialStartTime] = splitDateTime(filters.start_datetime);
    const [initialEndDate, initialEndTime] = splitDateTime(filters.end_datetime);

    // Server-side fetch filters - only these trigger a request (a fresh
    // BigQuery query), and only on explicit Apply.
    const [localStartDate, setLocalStartDate] = useState(initialStartDate);
    const [localStartTime, setLocalStartTime] = useState(initialStartTime);
    const [localEndDate, setLocalEndDate] = useState(initialEndDate);
    const [localEndTime, setLocalEndTime] = useState(initialEndTime);
    const [localLogType, setLocalLogType] = useState(filters.log_type ?? '');

    // Client-side-only table state - search/filter/sort/paginate the
    // already-fetched `rows`, never a server round-trip.
    const [search, setSearch] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('');
    const [sort, setSort] = useState<SortKey>('log_datetime');
    const [direction, setDirection] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState(1);

    const applyFetch = (e: FormEvent) => {
        e.preventDefault();
        router.get(
            '/operations/driver-assignment/logs',
            {
                start_datetime: localStartDate && localStartTime ? `${localStartDate}T${localStartTime}` : null,
                end_datetime: localEndDate && localEndTime ? `${localEndDate}T${localEndTime}` : null,
                log_type: localLogType || null,
            },
            { preserveState: true, preserveScroll: true, only: ['rows', 'filters', 'error'] },
        );
    };

    const exportUrl = buildExportUrl('/operations/driver-assignment/logs/export', {
        start_datetime: filters.start_datetime,
        end_datetime: filters.end_datetime,
        log_type: filters.log_type,
    });

    const locationOptions = useMemo(
        () => [...new Set(rows.map((r) => r.location).filter(Boolean))].sort(),
        [rows],
    );
    const departmentOptions = useMemo(
        () => [...new Set(rows.map((r) => r.department).filter(Boolean))].sort(),
        [rows],
    );

    const filteredSorted = useMemo(() => {
        const needle = search.trim().toLowerCase();

        const filtered = rows.filter((row) => {
            if (locationFilter && row.location !== locationFilter) return false;
            if (departmentFilter && row.department !== departmentFilter) return false;
            if (!needle) return true;

            return (
                row.employee_id.toLowerCase().includes(needle) ||
                row.full_name.toLowerCase().includes(needle) ||
                row.department.toLowerCase().includes(needle) ||
                row.section.toLowerCase().includes(needle) ||
                row.location.toLowerCase().includes(needle)
            );
        });

        const sorted = [...filtered].sort((a, b) => {
            const result = String(a[sort]).localeCompare(String(b[sort]));
            return direction === 'asc' ? result : -result;
        });

        return sorted;
    }, [rows, search, locationFilter, departmentFilter, sort, direction]);

    const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PER_PAGE));
    const currentPage = Math.min(page, totalPages);
    const pageRows = filteredSorted.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);
    const from = filteredSorted.length === 0 ? null : (currentPage - 1) * PER_PAGE + 1;
    const to = filteredSorted.length === 0 ? null : Math.min(currentPage * PER_PAGE, filteredSorted.length);

    const toggleSort = (column: SortKey) => {
        setDirection(sort === column && direction === 'asc' ? 'desc' : 'asc');
        setSort(column);
        setPage(1);
    };

    const hasRange = !!(filters.start_datetime && filters.end_datetime);

    return (
        <AppLayout>
            <Head title="Biometrics Logs" />

            <PageHeader
                title="Driver Biometrics Logs"
                description="Raw biometric scan events for Prime Mover Drivers over a selected date/time range."
                actions={<CsvExportButton url={exportUrl} filename="biometric_logs.xlsx" />}
            />

            <Card className="mb-4 p-3">
                <form onSubmit={applyFetch} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto]">
                    <div>
                        <Label>Start</Label>
                        <div className="flex gap-1.5">
                            <Input type="date" value={localStartDate} onChange={(e) => setLocalStartDate(e.target.value)} required />
                            <Input type="time" value={localStartTime} onChange={(e) => setLocalStartTime(e.target.value)} required />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Required. Range capped at 31 days.</p>
                    </div>

                    <div>
                        <Label>End</Label>
                        <div className="flex gap-1.5">
                            <Input type="date" value={localEndDate} onChange={(e) => setLocalEndDate(e.target.value)} required />
                            <Input type="time" value={localEndTime} onChange={(e) => setLocalEndTime(e.target.value)} required />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Required.</p>
                    </div>

                    <div>
                        <Label htmlFor="log_type">Log Type</Label>
                        <Select id="log_type" value={localLogType} onChange={(e) => setLocalLogType(e.target.value as Filters['log_type'] | '')}>
                            <option value="">Both</option>
                            <option value="IN">IN</option>
                            <option value="OUT">OUT</option>
                        </Select>
                    </div>

                    <Button type="submit" variant="primary">
                        Apply
                    </Button>
                </form>
            </Card>

            {error && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-500/10 dark:text-red-300">
                    {error}
                </div>
            )}

            {hasRange && !error && (
                <Card className="mb-4 p-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Input
                            type="text"
                            placeholder="Search by employee, department, section, location"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />
                        <Select
                            value={locationFilter}
                            onChange={(e) => {
                                setLocationFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">All locations</option>
                            {locationOptions.map((loc) => (
                                <option key={loc} value={loc}>
                                    {loc}
                                </option>
                            ))}
                        </Select>
                        <Select
                            value={departmentFilter}
                            onChange={(e) => {
                                setDepartmentFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">All departments</option>
                            {departmentOptions.map((dept) => (
                                <option key={dept} value={dept}>
                                    {dept}
                                </option>
                            ))}
                        </Select>
                    </div>
                </Card>
            )}

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800">
                                {COLUMNS.map((col) => (
                                    <th key={col.key} className="text-left">
                                        <button
                                            type="button"
                                            onClick={() => toggleSort(col.key)}
                                            className="inline-flex items-center gap-1 px-4 py-2.5 text-xs font-semibold whitespace-nowrap text-slate-500 uppercase hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
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
                            {pageRows.map((row, i) => (
                                <tr key={`${row.employee_id}-${row.log_datetime}-${i}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap text-slate-600 dark:text-slate-300">{row.employee_id}</td>
                                    <td className="px-4 py-2.5 whitespace-nowrap font-medium text-slate-900 dark:text-white">{row.full_name}</td>
                                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">{row.department}</td>
                                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">{row.section}</td>
                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                        <Badge tone={row.log_type === 'IN' ? 'green' : 'amber'}>{row.log_type}</Badge>
                                    </td>
                                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">{row.log_datetime}</td>
                                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">{row.location}</td>
                                </tr>
                            ))}

                            {pageRows.length === 0 && !hasRange && !error && (
                                <tr>
                                    <td colSpan={COLUMNS.length} className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-600">
                                        Select a Start and End date/time above to run the report.
                                    </td>
                                </tr>
                            )}

                            {pageRows.length === 0 && hasRange && !error && (
                                <tr>
                                    <td colSpan={COLUMNS.length} className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-600">
                                        No results for the selected filters.
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
                            <span className="font-medium text-slate-700 dark:text-slate-300">{filteredSorted.length}</span> records
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
