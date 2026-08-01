import PageHeader from '@/Components/PageHeader';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import Checkbox from '@/Components/ui/Checkbox';
import Input from '@/Components/ui/Input';
import Label from '@/Components/ui/Label';
import Select from '@/Components/ui/Select';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { RefreshCw } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

interface DriverRef {
    id: number;
    employee_id: string;
    full_name: string;
    on_duty_since: string | null;
}

interface TruckRef {
    id: number;
    truck_number: string;
}

interface TruckRow {
    id: number;
    truck_number: string;
    activeAssignment: { id: number; assigned_at: string; driver: DriverRef } | null;
}

interface DriverRow {
    id: number;
    employee_id: string;
    full_name: string;
    on_duty_since: string | null;
    activeAssignment: { id: number; truck: TruckRef } | null;
}

interface SyncLogSummary {
    status: 'success' | 'failed';
    finished_at: string | null;
    rows_synced: number | null;
}

interface Props {
    trucks: TruckRow[];
    onDutyDrivers: DriverRow[];
    lastSync: {
        masterlist: SyncLogSummary | null;
        attendance: SyncLogSummary | null;
    };
}

function formatDateTime(value: string | null): string {
    if (!value) return 'Never';
    try {
        return new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    } catch {
        return value;
    }
}

function SyncBadge({ label, log }: { label: string; log: SyncLogSummary | null }) {
    if (!log) {
        return <Badge tone="neutral">{label}: never synced</Badge>;
    }

    return (
        <Badge tone={log.status === 'success' ? 'green' : 'red'}>
            {label}: {formatDateTime(log.finished_at)}
            {log.status === 'failed' && ' (failed)'}
        </Badge>
    );
}

export default function DriverAssignmentIndex({ trucks, onDutyDrivers, lastSync }: Props) {
    const [selectedDriver, setSelectedDriver] = useState<Record<number, string>>({});
    const [driverSearch, setDriverSearch] = useState('');
    const [availableOnly, setAvailableOnly] = useState(false);

    const addTruckForm = useForm({ truck_number: '' });

    const submitAddTruck: FormEventHandler = (e) => {
        e.preventDefault();
        addTruckForm.post('/operations/driver-assignment/trucks', {
            preserveScroll: true,
            onSuccess: () => addTruckForm.reset(),
        });
    };

    const fetchNow = () => {
        router.post('/operations/driver-assignment/sync-now', {}, { preserveScroll: true });
    };

    const assignDriver = (truckId: number) => {
        const driverId = selectedDriver[truckId];
        if (!driverId) return;

        router.post(`/operations/driver-assignment/trucks/${truckId}/assign`, { driver_id: driverId }, { preserveScroll: true });
    };

    const unassign = (truck: TruckRow) => {
        if (!window.confirm(`Unassign ${truck.activeAssignment?.driver.full_name} from ${truck.truck_number}?`)) {
            return;
        }

        router.delete(`/operations/driver-assignment/trucks/${truck.id}/assign`, { preserveScroll: true });
    };

    const deleteTruck = (truck: TruckRow) => {
        if (!window.confirm(`Delete truck ${truck.truck_number}? This cannot be undone.`)) {
            return;
        }

        router.delete(`/operations/driver-assignment/trucks/${truck.id}`, { preserveScroll: true });
    };

    const assignedDriverIds = new Set(trucks.map((t) => t.activeAssignment?.driver.id).filter((id): id is number => id !== undefined));

    const availableDrivers = (currentTruck: TruckRow) =>
        onDutyDrivers.filter((d) => !assignedDriverIds.has(d.id) || d.id === currentTruck.activeAssignment?.driver.id);

    // Display-only filtering for the On-Duty Drivers panel - the assign
    // dropdowns above always use the full, unfiltered onDutyDrivers list.
    const search = driverSearch.trim().toLowerCase();
    const visibleDrivers = onDutyDrivers.filter((driver) => {
        if (availableOnly && assignedDriverIds.has(driver.id)) return false;
        if (search && !driver.full_name.toLowerCase().includes(search) && !driver.employee_id.toLowerCase().includes(search)) return false;
        return true;
    });

    return (
        <AppLayout>
            <Head title="Driver Assignment" />

            <PageHeader
                title="Driver Assignment"
                description="Assign on-duty Prime Mover Drivers to trucks."
                actions={
                    <Button variant="secondary" onClick={fetchNow}>
                        <RefreshCw className="size-3.5" />
                        Fetch Now
                    </Button>
                }
            >
                <div className="mt-2 flex flex-wrap gap-2">
                    <SyncBadge label="Masterlist" log={lastSync.masterlist} />
                    <SyncBadge label="Attendance" log={lastSync.attendance} />
                </div>
            </PageHeader>

            <Card className="mb-4 p-3">
                <form onSubmit={submitAddTruck} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="w-full sm:w-56">
                        <Label htmlFor="truck_number">Add truck</Label>
                        <Input
                            id="truck_number"
                            type="text"
                            placeholder="Truck number"
                            value={addTruckForm.data.truck_number}
                            onChange={(e) => addTruckForm.setData('truck_number', e.target.value)}
                        />
                        {addTruckForm.errors.truck_number && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{addTruckForm.errors.truck_number}</p>
                        )}
                    </div>
                    <Button type="submit" variant="primary" disabled={addTruckForm.processing} className="w-full sm:w-auto">
                        Add Truck
                    </Button>
                </form>
            </Card>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-white">Trucks</h2>
                    <div className="space-y-3">
                        {trucks.map((truck) => (
                            <Card key={truck.id} className="p-3">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                        <p className="font-medium text-slate-900 dark:text-white">{truck.truck_number}</p>
                                        {truck.activeAssignment ? (
                                            <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                                                {truck.activeAssignment.driver.full_name} &middot; on duty since{' '}
                                                {formatDateTime(truck.activeAssignment.driver.on_duty_since)}
                                            </p>
                                        ) : (
                                            <p className="text-sm text-slate-400 dark:text-slate-600">Unassigned</p>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                        {truck.activeAssignment ? (
                                            <Button variant="secondary" className="w-full sm:w-auto" onClick={() => unassign(truck)}>
                                                Unassign
                                            </Button>
                                        ) : (
                                            <>
                                                <Select
                                                    className="w-full sm:w-48"
                                                    value={selectedDriver[truck.id] ?? ''}
                                                    onChange={(e) => setSelectedDriver((prev) => ({ ...prev, [truck.id]: e.target.value }))}
                                                >
                                                    <option value="">Select driver…</option>
                                                    {availableDrivers(truck).map((driver) => (
                                                        <option key={driver.id} value={driver.id}>
                                                            {driver.full_name}
                                                        </option>
                                                    ))}
                                                </Select>
                                                <Button
                                                    variant="primary"
                                                    className="w-full sm:w-auto"
                                                    disabled={!selectedDriver[truck.id]}
                                                    onClick={() => assignDriver(truck.id)}
                                                >
                                                    Assign
                                                </Button>
                                            </>
                                        )}
                                        <Button variant="danger" className="w-full sm:w-auto" onClick={() => deleteTruck(truck)}>
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}

                        {trucks.length === 0 && <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-600">No trucks added yet.</p>}
                    </div>
                </div>

                <div>
                    <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-white">
                        On-Duty Drivers{' '}
                        <span className="font-normal text-slate-400 dark:text-slate-600">
                            ({visibleDrivers.length}
                            {visibleDrivers.length !== onDutyDrivers.length && ` of ${onDutyDrivers.length}`})
                        </span>
                    </h2>

                    <div className="mb-3 space-y-2">
                        <Input
                            type="text"
                            placeholder="Search drivers…"
                            value={driverSearch}
                            onChange={(e) => setDriverSearch(e.target.value)}
                        />
                        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <Checkbox checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} />
                            Available only
                        </label>
                    </div>

                    <Card className="max-h-80 divide-y divide-slate-100 overflow-y-auto sm:max-h-[28rem] dark:divide-slate-800">
                        {visibleDrivers.map((driver) => (
                            <div key={driver.id} className="flex items-center justify-between gap-2 p-3">
                                <div className="min-w-0">
                                    <p className="truncate font-medium text-slate-900 dark:text-white">{driver.full_name}</p>
                                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{driver.employee_id}</p>
                                </div>
                                <Badge tone={driver.activeAssignment ? 'blue' : 'green'}>
                                    {driver.activeAssignment ? driver.activeAssignment.truck.truck_number : 'Available'}
                                </Badge>
                            </div>
                        ))}

                        {onDutyDrivers.length === 0 && (
                            <p className="p-3 text-center text-sm text-slate-400 dark:text-slate-600">No drivers currently on duty.</p>
                        )}
                        {onDutyDrivers.length > 0 && visibleDrivers.length === 0 && (
                            <p className="p-3 text-center text-sm text-slate-400 dark:text-slate-600">No drivers match your search.</p>
                        )}
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
