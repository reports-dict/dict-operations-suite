import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginationProps {
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
}

export default function Pagination({ links, from, to, total }: PaginationProps) {
    if (total === 0) {
        return null;
    }

    const prev = links[0];
    const next = links[links.length - 1];
    const pages = links.slice(1, -1);

    return (
        <div className="flex flex-col gap-2.5 border-t border-slate-200 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <p className="text-xs text-slate-500 dark:text-slate-400">
                Showing <span className="font-medium text-slate-700 dark:text-slate-300">{from}</span>&ndash;
                <span className="font-medium text-slate-700 dark:text-slate-300">{to}</span> of{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">{total}</span>
            </p>

            <div className="-mx-1 flex items-center gap-1 overflow-x-auto px-1">
                <PageLink href={prev.url} disabled={!prev.url} aria-label="Previous page">
                    <ChevronLeft className="size-3.5" />
                </PageLink>

                {pages.map((link, i) => (
                    <PageLink key={i} href={link.url} active={link.active} label={link.label} />
                ))}

                <PageLink href={next.url} disabled={!next.url} aria-label="Next page">
                    <ChevronRight className="size-3.5" />
                </PageLink>
            </div>
        </div>
    );
}

function PageLink({
    href,
    active,
    disabled,
    label,
    children,
    ...rest
}: {
    href: string | null;
    active?: boolean;
    disabled?: boolean;
    label?: string;
    children?: React.ReactNode;
    'aria-label'?: string;
}) {
    const classes = cn(
        'flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md px-1.5 text-xs font-medium',
        active
            ? 'bg-green-600 text-white'
            : disabled
              ? 'cursor-not-allowed text-slate-300 dark:text-slate-700'
              : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
    );

    if (disabled || !href) {
        return (
            <span className={classes} {...rest}>
                {children ?? label}
            </span>
        );
    }

    return (
        <Link href={href} preserveState preserveScroll className={classes} {...rest}>
            {children ?? label}
        </Link>
    );
}
