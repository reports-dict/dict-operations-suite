import { YardContainerRow } from '@/Pages/Operations/ContainerYard/types';
import { Plug, X, Zap } from 'lucide-react';

interface Props {
    container: YardContainerRow | null;
    onClose: () => void;
}

// Ported from local-simplified-xps-v2's resources/js/components/ContainerDetailsModal.jsx.
// The source fetched a fresh copy from GET /api/containers/{id} on open; since
// the yard_containers mirror is refreshed at most every 5 minutes and the
// caller already holds the full row from the containers list, that
// round-trip is dropped here - the passed-in container is shown directly.
export default function ContainerDetailsModal({ container, onClose }: Props) {
    if (!container) return null;

    const field = (label: string, value: string | number | null | undefined) => (
        <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-slate-400">{label}</label>
            <div className="overflow-hidden rounded bg-gray-100 px-2 py-1 text-sm text-ellipsis text-gray-900 dark:bg-slate-800 dark:text-slate-100">
                {value ?? 'N/A'}
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-6xl overflow-y-auto rounded-lg bg-white shadow-2xl dark:bg-slate-900">
                <div className="sticky top-0 flex items-center justify-between border-b bg-blue-600 p-4 text-white shadow-md">
                    <h2 className="text-xl font-bold">Container: {container.container || 'N/A'}</h2>
                    <button onClick={onClose} className="rounded-lg p-2 transition-colors hover:bg-blue-700">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {field('Position', container.position)}
                        <div>
                            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-slate-400">Category</label>
                            <div
                                className={`rounded px-2 py-1 text-xs font-semibold ${
                                    container.category === 'Import' || container.category === 'IMPRT'
                                        ? 'bg-amber-100 text-amber-900'
                                        : container.category === 'Export' || container.category === 'EXPRT'
                                          ? 'bg-blue-100 text-blue-900'
                                          : container.category === 'Storage' || container.category === 'STRGE'
                                            ? 'bg-gray-100 text-gray-900'
                                            : 'bg-red-100 text-red-900'
                                }`}
                            >
                                {container.category || 'N/A'}
                            </div>
                        </div>
                        {field('ISO Type', container.iso_type)}
                        {field('Dwell Days', container.dwell_days)}
                        {field('Line Operator', container.line_op)}
                        {field('Condition', container.condition)}
                        {field('Transit State', container.transit_state)}
                        {field('POD', container.pod_place_name)}
                        {field('POL', container.pol_place_name)}
                        {field('Inbound Carrier', container.inbound_carrier_name)}
                        {field('Outbound Carrier', container.outbound_carrier_name)}
                        {field('Shipper', container.shipper)}
                        {field('Consignee', container.consignee)}
                        {field('Time In', container.time_in ? new Date(container.time_in).toLocaleString() : null)}
                    </div>

                    {container.notes && (
                        <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                            <label className="mb-1 block text-xs font-semibold text-gray-600 dark:text-slate-400">Notes</label>
                            <div className="text-sm whitespace-pre-wrap text-gray-900 dark:text-slate-100">{container.notes}</div>
                        </div>
                    )}

                    <div className="mt-4 flex items-center gap-6 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-gray-600 dark:text-slate-400">Requires Power:</label>
                            <Zap size={18} className={container.requires_power ? 'text-amber-500' : 'text-gray-300'} strokeWidth={2.5} />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-gray-600 dark:text-slate-400">Is Powered:</label>
                            <Plug size={18} className={container.is_powered ? 'text-green-500' : 'text-gray-300'} strokeWidth={2.5} />
                        </div>
                    </div>

                    <div className="mt-4 flex justify-end border-t pt-4 dark:border-slate-800">
                        <button
                            onClick={onClose}
                            className="rounded bg-gray-300 px-4 py-2 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-400 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
