import BaySelector from '@/Components/ContainerYard/BaySelector';
import BayStackingView from '@/Components/ContainerYard/BayStackingView';
import BlockGridSelector from '@/Components/ContainerYard/BlockGridSelector';
import ContainerDetailsModal from '@/Components/ContainerYard/ContainerDetailsModal';
import AppLayout from '@/Layouts/AppLayout';
import { SharedProps } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Check,
    Copy,
    MapPin,
    Package,
    Search,
    Thermometer,
    X,
} from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import {
    BlocksDataResponse,
    ContainersDataResponse,
    LiveSearchResponse,
    LiveSearchRow,
    YardBlockRow,
    YardContainerRow,
} from './types';

const CATEGORY_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
    Import: { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
    IMPRT: { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
    Export: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
    EXPRT: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
    Storage: { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-500' },
    STRGE: { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-500' },
    Transship: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
    TRSHP: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500' },
};

function categoryStyle(cat: string | null) {
    return (cat && CATEGORY_STYLES[cat]) || { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' };
}

// Quick "where is / where should this container go" lookup - ported from
// local-simplified-xps-v2's resources/js/pages/ContainerSearch.jsx, folded
// into the Board as a modal rather than a standalone route/page (this app
// has no client-side router - see routes/kiosk.php's data/search endpoint).
function QuickSearchModal({ onClose }: { onClose: () => void }) {
    const [searchInput, setSearchInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [rows, setRows] = useState<LiveSearchRow[] | null>(null);
    const [allowedLocations, setAllowedLocations] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [showResults, setShowResults] = useState(false);
    const [copied, setCopied] = useState(false);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const term = searchInput.trim();
        if (!term) return;

        setIsLoading(true);
        setError(null);
        setRows(null);

        try {
            const res = await fetch(`/operations/container-yard/data/search?q=${encodeURIComponent(term)}`);
            const data: LiveSearchResponse = await res.json();
            if (!data.success) {
                setError(data.error || 'Search failed.');
            } else {
                setRows(data.data ?? []);
                setAllowedLocations(data.allowed_locations ?? []);
                setShowResults(true);
            }
        } catch {
            setError('Failed to reach the server. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const headerRow = rows?.[0] ?? null;

    return (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-slate-800">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">Quick Container Search</h2>
                    <button onClick={onClose} className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-800">
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto p-6">
                    {!showResults ? (
                        <form onSubmit={handleSearch} className="space-y-4">
                            <div>
                                <label htmlFor="quick-search" className="mb-2 block text-sm font-semibold text-gray-700 dark:text-slate-300">
                                    Container Number
                                </label>
                                <div className="relative">
                                    <input
                                        id="quick-search"
                                        type="text"
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        placeholder="e.g., CONT123456 or last 5 digits"
                                        className="w-full rounded-lg border-2 border-gray-200 px-4 py-3 pr-12 text-lg transition-colors focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                        autoFocus
                                    />
                                    <Search size={22} className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-gray-400" />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={!searchInput.trim() || isLoading}
                                className={`w-full rounded-lg py-3 text-lg font-semibold text-white transition-all ${
                                    !searchInput.trim() || isLoading ? 'cursor-not-allowed bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                            >
                                {isLoading ? 'Searching…' : 'Search'}
                            </button>
                            {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}
                        </form>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Package size={20} className="text-blue-600" />
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-mono text-lg font-bold tracking-wide text-gray-900 dark:text-white">
                                            {headerRow?.container ?? searchInput}
                                        </h3>
                                        <button
                                            onClick={() => copyToClipboard(headerRow?.container ?? searchInput)}
                                            title="Copy container number"
                                            className={`rounded p-1 transition-colors ${copied ? 'bg-green-50 text-green-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
                                        >
                                            {copied ? <Check size={15} /> : <Copy size={15} />}
                                        </button>
                                    </div>
                                    {headerRow && (
                                        <div className="mt-0.5 flex items-center gap-2">
                                            {headerRow.reefer_type === 'RFR' && (
                                                <span className="flex items-center gap-1 rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-semibold text-cyan-700">
                                                    <Thermometer size={11} /> RFR
                                                </span>
                                            )}
                                            {(() => {
                                                const s = categoryStyle(headerRow.category);
                                                return (
                                                    <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${s.bg} ${s.text}`}>
                                                        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                                                        {headerRow.category}
                                                    </span>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {(rows ?? []).length === 0 ? (
                                <div className="py-16 text-center">
                                    <Package size={40} className="mx-auto mb-3 text-gray-300" />
                                    <p className="font-medium text-gray-500">No containers found</p>
                                    <p className="mt-1 text-sm text-gray-400">Try a different container number</p>
                                </div>
                            ) : (
                                (rows ?? []).map((row, idx) => (
                                    <div key={idx} className="rounded-xl border border-gray-100 bg-gray-50 p-5 dark:border-slate-800 dark:bg-slate-950">
                                        {row.pos && (
                                            <div className="mb-4 flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2">
                                                <ArrowRight size={17} className="shrink-0 text-indigo-500" />
                                                <div>
                                                    <p className="text-sm font-medium text-indigo-400">Pos</p>
                                                    <p className="font-mono text-3xl font-bold text-indigo-700">{row.pos}</p>
                                                </div>
                                                <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-sm font-semibold text-indigo-400">
                                                    {row.move_kind}
                                                </span>
                                            </div>
                                        )}

                                        {row.yard_slot && (
                                            <div className="mb-4 rounded-lg border-2 border-amber-400 bg-amber-50 px-4 py-3">
                                                <p className="mb-1 text-xs font-bold tracking-widest text-amber-600 uppercase">Allocation Filter</p>
                                                <p className="text-base text-amber-900">{row.yard_slot}</p>
                                            </div>
                                        )}

                                        <div className="flex flex-wrap items-center gap-4 text-sm">
                                            <div>
                                                <p className="text-xs font-medium text-gray-400">Type</p>
                                                <p className="font-semibold text-gray-800">{row.type_iso || '—'}</p>
                                            </div>
                                            <div className="h-8 w-px shrink-0 bg-gray-200" />
                                            <div>
                                                <p className="text-xs font-medium text-gray-400">Line Op</p>
                                                <p className="font-semibold text-gray-800">{row.line_op || '—'}</p>
                                            </div>
                                            <div className="h-8 w-px shrink-0 bg-gray-200" />
                                            <div>
                                                <p className="text-xs font-medium text-gray-400">O/B Actual Visit</p>
                                                <p className="font-semibold text-gray-800">{row.ob_vessel || '—'}</p>
                                            </div>
                                        </div>

                                        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                                            <p className="mb-2 flex items-center gap-1 text-xs font-bold tracking-widest text-emerald-700 uppercase">
                                                <MapPin size={13} /> Allowed Locations
                                            </p>
                                            {allowedLocations.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {allowedLocations.map((loc, i) => (
                                                        <span key={i} className="rounded-lg bg-emerald-600 px-4 py-2 font-mono text-xl tracking-wide text-white">
                                                            {loc}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-emerald-600 italic">No allocation match found.</p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}

                            <button
                                onClick={() => {
                                    setShowResults(false);
                                    setRows(null);
                                    setSearchInput('');
                                }}
                                className="w-full rounded-lg bg-gray-100 px-4 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                                New Search
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ContainerYardBoard() {
    const { auth } = usePage<SharedProps>().props;

    const [blocks, setBlocks] = useState<YardBlockRow[]>([]);
    const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
    const [selectedBay, setSelectedBay] = useState<number | null>(null);
    const [containers, setContainers] = useState<YardContainerRow[]>([]);
    const [containersLoading, setContainersLoading] = useState(false);
    const [selectedContainer, setSelectedContainer] = useState<YardContainerRow | null>(null);
    const [quickSearchOpen, setQuickSearchOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchBlocks = () => {
            fetch('/operations/container-yard/data/blocks?active_only=1&per_page=200')
                .then((res) => res.json())
                .then((data: BlocksDataResponse) => setBlocks(data.data ?? []))
                .catch(() => setError('Failed to load blocks.'));
        };

        fetchBlocks();

        // Client-side Inertia navigations into this page don't always remount
        // this component (e.g. arriving via a sidebar Link), so a plain
        // mount-only effect can leave `blocks` stuck at its initial empty
        // state until a hard browser refresh forces a real remount. Re-fetch
        // on every completed Inertia navigation as a reliable trigger instead.
        return router.on('navigate', fetchBlocks);
    }, []);

    useEffect(() => {
        if (!selectedBlock) {
            setContainers([]);
            return;
        }

        setContainersLoading(true);
        fetch(`/operations/container-yard/data/containers?block=${encodeURIComponent(selectedBlock)}&per_page=1000`)
            .then((res) => res.json())
            .then((data: ContainersDataResponse) => setContainers(data.data ?? []))
            .catch(() => setError('Failed to load containers for this block.'))
            .finally(() => setContainersLoading(false));
    }, [selectedBlock]);

    const handleBlockSelect = (blockName: string) => {
        if (selectedBlock === blockName) {
            setSelectedBlock(null);
            setSelectedBay(null);
        } else {
            setSelectedBlock(blockName);
            setSelectedBay(null);
        }
    };

    const currentBlock = blocks.find((b) => b.name === selectedBlock) ?? null;
    const showSidebar = !!auth.user;

    const content: ReactNode = (
        <>
            <Head title="Container Yard" />
            <div className={`${showSidebar ? '' : 'min-h-screen '}bg-gray-50 px-4 py-6 dark:bg-slate-950 sm:px-6`}>
                <div className={showSidebar ? '' : 'mx-auto max-w-screen-2xl'}>
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Container Yard</h1>
                            <p className="text-sm text-gray-600 dark:text-slate-400">Block / Bay / Row / Tier yard placement viewer</p>
                        </div>
                        <button
                            onClick={() => setQuickSearchOpen(true)}
                            className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-500/10 dark:text-blue-300"
                        >
                            <Search size={18} />
                            <span>Quick Search</span>
                        </button>
                    </div>

                    {error && (
                        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="mb-6 flex flex-col gap-6 md:flex-row">
                        <div className="flex-1">
                            <BlockGridSelector blocks={blocks} selectedBlock={selectedBlock} onBlockSelect={handleBlockSelect} />
                        </div>
                        {selectedBlock && (
                            <div className="flex-1">
                                <BaySelector block={currentBlock} selectedBay={selectedBay} onBaySelect={setSelectedBay} />
                            </div>
                        )}
                    </div>

                    {containersLoading && <div className="py-12 text-center text-gray-600 dark:text-slate-400">Loading containers…</div>}

                    {!containersLoading && selectedBlock && selectedBay && (
                        <BayStackingView
                            blockName={selectedBlock}
                            bayNumber={selectedBay}
                            block={currentBlock}
                            containers={containers}
                            onContainerClick={setSelectedContainer}
                            onClose={() => setSelectedBay(null)}
                        />
                    )}

                    {!containersLoading && !selectedBlock && (
                        <div className="rounded-lg bg-white p-12 text-center shadow-md dark:bg-slate-900">
                            <Package className="mx-auto mb-4 text-gray-400" size={48} />
                            <p className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Select a block and bay to view details</p>
                            <p className="text-gray-600 dark:text-slate-400">Use the dropdowns above to select a block and bay</p>
                        </div>
                    )}

                    {!containersLoading && selectedBlock && !selectedBay && (
                        <div className="rounded-lg bg-white p-12 text-center shadow-md dark:bg-slate-900">
                            <Package className="mx-auto mb-4 text-gray-400" size={48} />
                            <p className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Select a bay to view stacking details</p>
                            <p className="text-gray-600 dark:text-slate-400">Use the bay dropdown to select a bay</p>
                        </div>
                    )}
                </div>
            </div>

            {selectedContainer && <ContainerDetailsModal container={selectedContainer} onClose={() => setSelectedContainer(null)} />}
            {quickSearchOpen && <QuickSearchModal onClose={() => setQuickSearchOpen(false)} />}
        </>
    );

    return showSidebar ? <AppLayout>{content}</AppLayout> : content;
}
