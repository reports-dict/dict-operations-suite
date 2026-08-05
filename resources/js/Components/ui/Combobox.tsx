import { cn } from '@/lib/utils';
import { useEffect, useMemo, useRef, useState } from 'react';

export interface ComboboxOption {
    id: number;
    label: string;
    sublabel?: string;
}

interface ComboboxProps {
    options: ComboboxOption[];
    value: number | null;
    onChange: (id: number) => void;
    placeholder?: string;
    id?: string;
    className?: string;
}

export default function Combobox({ options, value, onChange, placeholder = 'Search…', id, className }: ComboboxProps) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selected = useMemo(() => options.find((option) => option.id === value) ?? null, [options, value]);

    useEffect(() => {
        setQuery(selected ? selected.label : '');
    }, [selected]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
                setQuery(selected ? selected.label : '');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [selected]);

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle || (selected && needle === selected.label.toLowerCase())) {
            return options;
        }

        return options.filter(
            (option) => option.label.toLowerCase().includes(needle) || option.sublabel?.toLowerCase().includes(needle),
        );
    }, [options, query, selected]);

    const select = (option: ComboboxOption) => {
        onChange(option.id);
        setQuery(option.label);
        setOpen(false);
    };

    return (
        <div ref={containerRef} className="relative">
            <input
                id={id}
                type="text"
                role="combobox"
                aria-expanded={open}
                autoComplete="off"
                className={cn(
                    'block w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500',
                    className,
                )}
                placeholder={placeholder}
                value={query}
                onFocus={() => setOpen(true)}
                onChange={(e) => {
                    setQuery(e.target.value);
                    setOpen(true);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        setOpen(false);
                        setQuery(selected ? selected.label : '');
                    }
                }}
            />

            {open && (
                <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                    {filtered.length === 0 && <li className="px-2.5 py-1.5 text-sm text-slate-400 dark:text-slate-600">No matches</li>}

                    {filtered.map((option) => (
                        <li key={option.id}>
                            <button
                                type="button"
                                className={cn(
                                    'flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50',
                                    option.id === value ? 'bg-green-50 dark:bg-green-500/10' : '',
                                )}
                                onClick={() => select(option)}
                            >
                                <span className="text-slate-900 dark:text-white">{option.label}</span>
                                {option.sublabel && <span className="text-xs text-slate-400 dark:text-slate-500">{option.sublabel}</span>}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
