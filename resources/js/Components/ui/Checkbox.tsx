import { cn } from '@/lib/utils';
import { InputHTMLAttributes, forwardRef } from 'react';

const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
    <input
        ref={ref}
        type="checkbox"
        className={cn(
            'size-4 rounded border-slate-300 text-green-600 focus:ring-1 focus:ring-green-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900',
            className,
        )}
        {...props}
    />
));
Checkbox.displayName = 'Checkbox';

export default Checkbox;
