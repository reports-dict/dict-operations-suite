import { YardBlockRow } from '@/Pages/Operations/ContainerYard/types';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface Props {
    block: YardBlockRow | null;
    selectedBay: number | null;
    onBaySelect: (bay: number) => void;
}

// Ported from local-simplified-xps-v2's resources/js/components/BaySelector.jsx.
export default function BaySelector({ block, selectedBay = null, onBaySelect }: Props) {
    const [isOpen, setIsOpen] = useState(false);

    if (!block) return null;

    const excludedRows = block.excluded_rows
        ? block.excluded_rows
              .split(',')
              .map((n) => parseInt(n.trim(), 10))
              .filter((n) => !isNaN(n))
        : [];

    const bays = Array.from({ length: block.bay_end - block.bay_start + 1 }, (_, i) => block.bay_start + i).filter(
        (bay) => !excludedRows.includes(bay),
    );

    return (
        <div className="rounded-lg bg-white p-6 shadow-md dark:bg-slate-900">
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Bays</h2>

            <div className="relative w-full md:w-64">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex w-full items-center justify-between rounded-lg border border-gray-300 bg-gray-100 px-4 py-3 font-semibold text-gray-900 transition-all hover:bg-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                >
                    <span>{selectedBay ? <span className="font-bold">Bay {selectedBay}</span> : 'Select a Bay...'}</span>
                    <ChevronDown size={20} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 z-10 mt-2 max-h-96 w-full overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                        {bays.map((bay) => (
                            <button
                                key={bay}
                                type="button"
                                onClick={() => {
                                    onBaySelect(bay);
                                    setIsOpen(false);
                                }}
                                className={`w-full border-b border-gray-200 px-4 py-3 text-left font-semibold transition-all hover:bg-blue-50 dark:border-slate-800 dark:hover:bg-slate-800 ${
                                    selectedBay === bay ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                                }`}
                            >
                                Bay {bay}
                            </button>
                        ))}
                    </div>
                )}

                {isOpen && <div className="fixed inset-0 z-0" onClick={() => setIsOpen(false)} />}
            </div>
        </div>
    );
}
