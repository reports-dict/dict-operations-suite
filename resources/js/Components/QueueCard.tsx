import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ReactNode } from 'react';

export interface QueueCardField<T> {
    key: keyof T & string;
    label: string;
    render?: (row: T) => ReactNode;
}

interface QueueCardProps<T> {
    index: number;
    row: T;
    primaryFields: QueueCardField<T>[];
    secondaryFields: QueueCardField<T>[];
    highlighted: boolean;
    expanded: boolean;
    onToggleExpanded: () => void;
}

function fieldValue<T>(row: T, field: QueueCardField<T>): ReactNode {
    if (field.render) return field.render(row);
    const value = row[field.key];
    return (value as ReactNode) || '-';
}

// Generic table-row -> card transform used by the Road Queue kiosk boards
// below their `lg:` table breakpoint. Deliberately knows nothing about
// elapsed-time/category semantics - each board supplies its own render()
// closures per field, same as it already owns its COLUMNS array for the
// table. Background/border are picked as one full class-string arm (not
// layered conditionally onto a shared bg-white default) since two
// same-specificity Tailwind utilities targeting the same property don't
// reliably override by string position.
export default function QueueCard<T extends object>({
    index,
    row,
    primaryFields,
    secondaryFields,
    highlighted,
    expanded,
    onToggleExpanded,
}: QueueCardProps<T>) {
    const tone = highlighted ? 'border-red-300 bg-red-200' : 'border-slate-200 bg-white';

    return (
        <div className={`rounded-lg border p-3 shadow-sm transition ${tone}`}>
            <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400">#{index + 1}</span>
                {highlighted && <Badge tone="red">Overdue</Badge>}
            </div>

            <div className="flex flex-col gap-1.5">
                {primaryFields.map((field) => (
                    <div key={field.key} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-slate-500">{field.label}</span>
                        <span className="text-right font-bold text-slate-900">{fieldValue(row, field)}</span>
                    </div>
                ))}
            </div>

            {secondaryFields.length > 0 && (
                <>
                    <div className="mt-2 border-t border-slate-100 pt-2">
                        <Button variant="ghost" size="sm" className="w-full justify-center" onClick={onToggleExpanded}>
                            {expanded ? (
                                <>
                                    Hide Details <ChevronUp className="size-3.5" />
                                </>
                            ) : (
                                <>
                                    Show Details <ChevronDown className="size-3.5" />
                                </>
                            )}
                        </Button>
                    </div>

                    {expanded && (
                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-slate-100 pt-2 text-xs text-slate-600 sm:grid-cols-3">
                            {secondaryFields.map((field) => (
                                <span key={field.key}>
                                    {field.label}: <b className="text-slate-900">{fieldValue(row, field)}</b>
                                </span>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
