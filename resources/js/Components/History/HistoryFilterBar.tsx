import Button from '@/Components/ui/Button';
import Input from '@/Components/ui/Input';
import Label from '@/Components/ui/Label';
import Select from '@/Components/ui/Select';
import { FormEvent } from 'react';

export type FilterField =
    | { type: 'select'; name: string; label: string; options: { value: string; label: string }[] }
    | { type: 'date'; name: string; label: string }
    | { type: 'text'; name: string; label: string; placeholder?: string };

interface HistoryFilterBarProps {
    fields: FilterField[];
    values: Record<string, string>;
    onChange: (name: string, value: string) => void;
    onSubmit: () => void;
    onReset: () => void;
    hasActiveFilters: boolean;
}

export default function HistoryFilterBar({ fields, values, onChange, onSubmit, onReset, hasActiveFilters }: HistoryFilterBarProps) {
    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onSubmit();
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 border-b border-slate-200 p-3 dark:border-slate-800">
            {fields.map((field) => (
                <div key={field.name} className="flex flex-col">
                    <Label htmlFor={field.name}>{field.label}</Label>
                    {field.type === 'select' ? (
                        <Select id={field.name} value={values[field.name] ?? ''} onChange={(e) => onChange(field.name, e.target.value)}>
                            {field.options.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </Select>
                    ) : (
                        <Input
                            id={field.name}
                            type={field.type}
                            placeholder={field.type === 'text' ? field.placeholder : undefined}
                            value={values[field.name] ?? ''}
                            onChange={(e) => onChange(field.name, e.target.value)}
                            className={field.type === 'text' ? 'w-44' : undefined}
                        />
                    )}
                </div>
            ))}

            <div className="flex gap-2">
                <Button type="submit" variant="primary">
                    Apply
                </Button>
                {hasActiveFilters && (
                    <Button type="button" variant="secondary" onClick={onReset}>
                        Reset
                    </Button>
                )}
            </div>
        </form>
    );
}
