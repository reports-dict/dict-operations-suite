import { cn } from '@/lib/utils';
import { LabelHTMLAttributes } from 'react';

export default function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
    return <label className={cn('mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400', className)} {...props} />;
}
