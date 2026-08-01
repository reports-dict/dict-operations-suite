import { cn } from '@/lib/utils';
import { PropsWithChildren } from 'react';

type Tone = 'neutral' | 'green' | 'amber' | 'red' | 'blue';

const tones: Record<Tone, string> = {
    neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    green: 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    red: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
};

export default function Badge({ tone = 'neutral', className, children }: PropsWithChildren<{ tone?: Tone; className?: string }>) {
    return (
        <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium', tones[tone], className)}>{children}</span>
    );
}
