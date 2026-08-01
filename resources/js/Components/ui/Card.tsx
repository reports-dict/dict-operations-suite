import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'react';

export default function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                'rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900',
                className,
            )}
            {...props}
        />
    );
}
