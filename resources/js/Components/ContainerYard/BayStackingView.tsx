import { MAX_TIERS, parsePosition } from '@/lib/containerYardPosition';
import { YardBlockRow, YardContainerRow } from '@/Pages/Operations/ContainerYard/types';
import { Plug, Zap } from 'lucide-react';

interface Props {
    blockName: string;
    bayNumber: number;
    block: YardBlockRow | null;
    containers: YardContainerRow[];
    onContainerClick: (container: YardContainerRow) => void;
    onClose: () => void;
}

function getCategoryColor(category: string | null) {
    switch (category) {
        case 'Import':
        case 'IMPRT':
            return 'bg-amber-700';
        case 'Export':
        case 'EXPRT':
            return 'bg-blue-500';
        case 'Storage':
        case 'STRGE':
            return 'bg-gray-500';
        case 'Transship':
        case 'TRSHP':
            return 'bg-red-400';
        default:
            return 'bg-gray-400';
    }
}

function getCategoryLabel(category: string | null) {
    switch (category) {
        case 'Import':
        case 'IMPRT':
            return 'Import';
        case 'Export':
        case 'EXPRT':
            return 'Export';
        case 'Storage':
        case 'STRGE':
            return 'Storage';
        case 'Transship':
        case 'TRSHP':
            return 'Transship';
        default:
            return 'Unknown';
    }
}

function truncateTo15Chars(text: string | null) {
    if (!text) return '';
    return text.length > 15 ? text.substring(0, 15) : text;
}

/**
 * A container is "hanging" if it's in tier 2+ and no container occupies the
 * tier directly below it.
 */
function isContainerHanging(containersByPosition: Map<string, YardContainerRow>, row: string, tier: number) {
    if (tier <= 1) return false;
    return !containersByPosition.has(`${row}-${tier - 1}`);
}

// Ported from local-simplified-xps-v2's resources/js/components/BayStackingView.jsx
// (confirmed as the component actually wired into App.jsx, not
// BayStackingViewNew.jsx or BlockView.backup.jsx).
export default function BayStackingView({ blockName, bayNumber, containers = [], block = null, onContainerClick, onClose }: Props) {
    const rows = (() => {
        if (!block) return ['A', 'B', 'C', 'D', 'E', 'F'];
        const rowsArr: string[] = [];
        for (let i = block.row_start.charCodeAt(0); i <= block.row_end.charCodeAt(0); i++) {
            rowsArr.push(String.fromCharCode(i));
        }
        return rowsArr;
    })();

    const containersByPosition = new Map<string, YardContainerRow>();
    containers.forEach((container) => {
        const parsed = parsePosition(container.position);
        if (parsed && parsed.block === blockName && parsed.bay === bayNumber) {
            containersByPosition.set(`${parsed.row}-${parsed.tier}`, container);
        }
    });

    let hangingCount = 0;
    containersByPosition.forEach((_container, key) => {
        const [row, tier] = key.split('-');
        if (isContainerHanging(containersByPosition, row, parseInt(tier, 10))) hangingCount++;
    });

    const tiers = Array.from({ length: MAX_TIERS }, (_, i) => MAX_TIERS - i);

    return (
        <div className="mb-6 rounded-lg bg-white p-6 shadow-md dark:bg-slate-900">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {blockName} - Bay {bayNumber}
                    </h2>
                    {hangingCount > 0 && (
                        <span className="inline-flex animate-pulse items-center gap-1 rounded-full border border-red-300 bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                            <span>⚠️</span>
                            <span>
                                {hangingCount} hanging container{hangingCount !== 1 ? 's' : ''}
                            </span>
                        </span>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="rounded-lg bg-gray-200 px-4 py-2 font-semibold text-gray-900 transition-colors hover:bg-gray-300 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                >
                    ← Back
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 bg-gray-50 dark:border-slate-700 dark:bg-slate-950">
                    <thead>
                        <tr>
                            <th className="w-16 border border-gray-300 bg-gray-200 px-4 py-3 font-semibold text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                                Tier
                            </th>
                            {rows.map((row) => (
                                <th
                                    key={row}
                                    className="border border-gray-300 bg-gray-200 px-8 py-3 text-center font-semibold text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                >
                                    {row}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {tiers.map((tier) => (
                            <tr key={tier}>
                                <td className="w-16 border border-gray-300 bg-gray-200 px-4 py-3 text-center font-semibold text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                                    {tier}
                                </td>
                                {rows.map((row) => {
                                    const key = `${row}-${tier}`;
                                    const container = containersByPosition.get(key);
                                    const hanging = container ? isContainerHanging(containersByPosition, row, tier) : false;

                                    return (
                                        <td key={key} className="h-28 border border-gray-300 bg-gray-100 p-2 dark:border-slate-800 dark:bg-slate-900">
                                            {container && (
                                                <button
                                                    onClick={() => onContainerClick(container)}
                                                    className={`relative flex h-full w-full items-center justify-center rounded p-2 text-white transition-opacity hover:opacity-90 ${getCategoryColor(
                                                        container.category,
                                                    )} ${hanging ? 'ring-2 ring-red-500 ring-inset' : ''}`}
                                                    title={`${container.container} - ${getCategoryLabel(container.category)}${hanging ? ' - HANGING CONTAINER' : ''}`}
                                                >
                                                    <div className="absolute top-1 left-1 flex flex-col gap-0.5">
                                                        <div className={`rounded p-0.5 ${container.requires_power ? 'bg-amber-500' : 'bg-gray-300'}`}>
                                                            <Zap size={12} className="text-white" strokeWidth={2.5} />
                                                        </div>
                                                        <div className={`rounded p-0.5 ${container.is_powered ? 'bg-green-500' : 'bg-gray-300'}`}>
                                                            <Plug size={12} className="text-white" strokeWidth={2.5} />
                                                        </div>
                                                    </div>

                                                    <div className="text-center">
                                                        <div className="truncate text-xs font-bold">{container.container}</div>
                                                        <div className="mt-1 text-xs">{getCategoryLabel(container.category)}</div>
                                                        <div className="mt-1 text-xs opacity-90">{container.iso_type || 'N/A'}</div>
                                                        {container.line_op && <div className="mt-0.5 text-xs opacity-75">{container.line_op}</div>}
                                                        {(container.category === 'Export' || container.category === 'EXPRT') && container.shipper && (
                                                            <div className="mt-1 truncate text-xs opacity-85" title={container.shipper}>
                                                                {truncateTo15Chars(container.shipper)}
                                                            </div>
                                                        )}
                                                        {(container.category === 'Import' || container.category === 'IMPRT') && container.consignee && (
                                                            <div className="mt-1 truncate text-xs opacity-85" title={container.consignee}>
                                                                {truncateTo15Chars(container.consignee)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </button>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <LegendSwatch color="bg-amber-700" label="Import" />
                <LegendSwatch color="bg-blue-500" label="Export" />
                <LegendSwatch color="bg-gray-500" label="Storage" />
                <LegendSwatch color="bg-red-400" label="Transship" />
                <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded border-2 border-red-500 bg-white" />
                    <span className="text-sm text-gray-700 dark:text-slate-300">Hanging Container</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="rounded bg-amber-500 p-0.5">
                        <Zap size={12} className="text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-slate-300">Requires Power</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="rounded bg-green-500 p-0.5">
                        <Plug size={12} className="text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-slate-300">Is Powered</span>
                </div>
            </div>
        </div>
    );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className={`h-4 w-4 rounded ${color}`} />
            <span className="text-sm text-gray-700 dark:text-slate-300">{label}</span>
        </div>
    );
}
