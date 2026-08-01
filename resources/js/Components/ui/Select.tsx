import { cn } from '@/lib/utils';
import { SelectHTMLAttributes, forwardRef } from 'react';

const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
    <select
        ref={ref}
        className={cn(
            'block w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white',
            className,
        )}
        {...props}
    >
        {children}
    </select>
));
Select.displayName = 'Select';

export default Select;
