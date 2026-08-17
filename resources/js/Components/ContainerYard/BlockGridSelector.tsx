import { YardBlockRow } from '@/Pages/Operations/ContainerYard/types';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface Props {
    blocks: YardBlockRow[];
    selectedBlock: string | null;
    onBlockSelect: (blockName: string) => void;
}

// Ported from local-simplified-xps-v2's resources/js/components/BlockGridSelector.jsx
// (dropdown, despite the "Grid" name in the source file).
export default function BlockGridSelector({ blocks = [], selectedBlock = null, onBlockSelect }: Props) {
    const [isOpen, setIsOpen] = useState(false);

    if (blocks.length === 0) {
        return <div className="rounded-lg bg-white p-6 text-center text-gray-500 shadow-md dark:bg-slate-900 dark:text-slate-400">No blocks available</div>;
    }

    const current = blocks.find((b) => b.name === selectedBlock);

    return (
        <div className="rounded-lg bg-white p-6 shadow-md dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Blocks</h2>

            <div className="relative w-full md:w-64">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 font-semibold text-gray-900 transition-all hover:bg-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                >
                    <span>
                        {current ? (
                            <span className="flex items-center gap-2">
                                <span className="font-bold">{current.name}</span>
                                <span className="text-xs text-gray-600 dark:text-slate-400">({current.facility === 'Terminal' ? 'Term' : 'ECD'})</span>
                            </span>
                        ) : (
                            'Select a Block...'
                        )}
                    </span>
                    <ChevronDown size={20} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 z-10 mt-2 max-h-96 w-full overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                        {blocks.map((block) => (
                            <button
                                key={block.id}
                                type="button"
                                onClick={() => {
                                    onBlockSelect(block.name);
                                    setIsOpen(false);
                                }}
                                className={`w-full border-b border-gray-200 px-4 py-3 text-left font-semibold transition-all hover:bg-blue-50 dark:border-slate-800 dark:hover:bg-slate-800 ${
                                    selectedBlock === block.name ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                                }`}
                                title={`View ${block.name} (Bays ${block.bay_start}-${block.bay_end})`}
                            >
                                <div className="flex items-center justify-between">
                                    <span>{block.name}</span>
                                    <span className="flex items-center gap-2 text-xs">
                                        <span className="text-gray-600 dark:text-slate-400">
                                            Bays {block.bay_start}-{block.bay_end}
                                        </span>
                                        <span
                                            className={`rounded px-2 py-1 text-[10px] font-bold text-white ${
                                                block.facility === 'Terminal' ? 'bg-blue-600' : 'bg-orange-600'
                                            }`}
                                        >
                                            {block.facility === 'Terminal' ? 'Term' : 'ECD'}
                                        </span>
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {isOpen && <div className="fixed inset-0 z-0" onClick={() => setIsOpen(false)} />}
            </div>
        </div>
    );
}
