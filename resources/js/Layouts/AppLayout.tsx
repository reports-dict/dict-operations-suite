import { cn } from '@/lib/utils';
import { MODULE_NAV, moduleNavPermission } from '@/lib/modules';
import { SharedProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { ChevronDown, ChevronLeft, ChevronRight, KeyRound, LayoutGrid, LogOut, Menu, ShieldCheck, X } from 'lucide-react';
import { PropsWithChildren, useEffect, useState } from 'react';

const SIDEBAR_COLLAPSED_KEY = 'dict-ops-sidebar-collapsed';

// Road Queue / Road Queue (ECD)'s sidebar links only go to their
// permission-gated history dashboard. Their live boards are public (see
// routes/kiosk.php) and meant to be pinned directly on a TV device, not
// navigated to from this authenticated sidebar.
//
// Nav shape (expandable group w/ sub-items vs. flat link) isn't DB-driven
// yet - see the comment in lib/modules.ts. Visibility *is* permission-
// filtered though (see `visibleModuleNav` below) - a whole entry (including
// its public Board child, if any) is hidden unless the user holds that
// module's `operations.{slug}.view` permission or is superadmin, since a
// user without History access has no reason to see the group at all.
const ADMIN_NAV_ITEMS = [
    { href: '/admin/users', label: 'User Access', icon: ShieldCheck },
    { href: '/admin/permissions', label: 'Module Permissions', icon: KeyRound },
];

interface AppLayoutProps {
    /**
     * Drops <main>'s default p-4/p-6 page padding so children can fill the
     * content area edge-to-edge - for pages that manage their own full-bleed
     * background (e.g. the Vessel Dashboard kiosk board), not a general page
     * option.
     */
    fullBleed?: boolean;
}

export default function AppLayout({ children, fullBleed = false }: PropsWithChildren<AppLayoutProps>) {
    const page = usePage<SharedProps>();
    const { auth } = page.props;
    const currentUrl = page.url;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(
        () => typeof window !== 'undefined' && localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true',
    );
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const toggleGroup = (key: string) => setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));

    useEffect(() => {
        setSidebarOpen(false);
    }, [currentUrl]);

    useEffect(() => {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    }, [collapsed]);

    const initials = auth.user?.name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    const isSuperadmin = auth.user?.roles.includes('superadmin') ?? false;
    const userPermissions = auth.user?.permissions ?? [];
    const visibleModuleNav = MODULE_NAV.filter(
        (entry) => isSuperadmin || userPermissions.includes(moduleNavPermission(entry)),
    );

    return (
        <div className="flex min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-white/10 bg-green-900 transition-all duration-200 ease-in-out lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0',
                    collapsed ? 'lg:w-16' : 'lg:w-56',
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full',
                )}
            >
                <div className="flex h-13 items-center justify-between gap-2 border-b border-white/10 px-4">
                    <div className="flex items-center gap-2">
                        <img src="/images/dict-logo.jpg" alt="DICT" className="size-6 shrink-0 rounded-md object-cover" />
                        <span className={cn('text-sm font-semibold whitespace-nowrap text-white', collapsed && 'lg:hidden')}>
                            DICT Operations
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(false)}
                        aria-label="Close menu"
                        className="flex size-7 shrink-0 items-center justify-center rounded-md text-green-200 hover:bg-white/10 hover:text-white lg:hidden"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                <nav className="flex-1 space-y-0.5 overflow-y-auto p-2.5">
                    <Link
                        href="/modules"
                        title={collapsed ? 'Modules' : undefined}
                        className={cn(
                            'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
                            currentUrl === '/modules' ? 'bg-white/15 text-white' : 'text-green-100/80 hover:bg-white/10 hover:text-white',
                        )}
                    >
                        <LayoutGrid className="size-4 shrink-0" strokeWidth={2} />
                        <span className={cn(collapsed && 'lg:hidden')}>Modules</span>
                    </Link>

                    {visibleModuleNav.length > 0 && (
                        <p
                            className={cn(
                                'px-2.5 pt-4 pb-1 text-[11px] font-semibold tracking-wider text-green-300/60 uppercase',
                                collapsed && 'lg:hidden',
                            )}
                        >
                            Operations
                        </p>
                    )}

                    {visibleModuleNav.map((entry) => {
                        const Icon = entry.icon;

                        if (entry.shape === 'flat') {
                            const active = currentUrl.startsWith(entry.href);

                            return (
                                <Link
                                    key={entry.key}
                                    href={entry.href}
                                    title={collapsed ? entry.navLabel : undefined}
                                    className={cn(
                                        'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
                                        active ? 'bg-white/15 text-white' : 'text-green-100/80 hover:bg-white/10 hover:text-white',
                                    )}
                                >
                                    <Icon className="size-4 shrink-0" strokeWidth={2} />
                                    <span className={cn(collapsed && 'lg:hidden')}>{entry.navLabel}</span>
                                </Link>
                            );
                        }

                        const active = currentUrl.startsWith(entry.basePath);
                        const childrenVisible = expandedGroups[entry.key] || active;

                        return (
                            <div key={entry.key}>
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(entry.key)}
                                    title={collapsed ? entry.navLabel : undefined}
                                    className={cn(
                                        'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
                                        active ? 'text-white' : 'text-green-100/80 hover:bg-white/10 hover:text-white',
                                    )}
                                >
                                    <Icon className="size-4 shrink-0" strokeWidth={2} />
                                    <span className={cn('flex-1 text-left', collapsed && 'lg:hidden')}>{entry.navLabel}</span>
                                    {childrenVisible ? (
                                        <ChevronDown className={cn('size-3.5 shrink-0', collapsed && 'lg:hidden')} />
                                    ) : (
                                        <ChevronRight className={cn('size-3.5 shrink-0', collapsed && 'lg:hidden')} />
                                    )}
                                </button>

                                {childrenVisible && (
                                    <div className={cn('mt-0.5 space-y-0.5 pl-6', collapsed && 'lg:hidden')}>
                                        {entry.children.map((child) => (
                                            <Link
                                                key={child.href}
                                                href={child.href}
                                                className={cn(
                                                    'block rounded-md px-2.5 py-1.5 text-sm transition-colors',
                                                    currentUrl === child.href
                                                        ? 'bg-white/15 font-medium text-white'
                                                        : 'text-green-100/70 hover:bg-white/10 hover:text-white',
                                                )}
                                            >
                                                {child.label}
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {auth.user?.roles.includes('superadmin') && (
                        <>
                            <p
                                className={cn(
                                    'px-2.5 pt-4 pb-1 text-[11px] font-semibold tracking-wider text-green-300/60 uppercase',
                                    collapsed && 'lg:hidden',
                                )}
                            >
                                Administration
                            </p>

                            {ADMIN_NAV_ITEMS.map((item) => {
                                const Icon = item.icon;
                                const active = currentUrl.startsWith(item.href);

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        title={collapsed ? item.label : undefined}
                                        className={cn(
                                            'flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
                                            active ? 'bg-white/15 text-white' : 'text-green-100/80 hover:bg-white/10 hover:text-white',
                                        )}
                                    >
                                        <Icon className="size-4 shrink-0" strokeWidth={2} />
                                        <span className={cn(collapsed && 'lg:hidden')}>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </>
                    )}
                </nav>

                {auth.user && (
                    <div className="flex items-center gap-2 border-t border-white/10 p-2.5">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white">
                            {initials}
                        </div>
                        <div className={cn('min-w-0 flex-1', collapsed && 'lg:hidden')}>
                            <p className="truncate text-xs font-medium text-white">{auth.user.name}</p>
                            <p className="truncate text-[11px] text-green-200/70 capitalize">
                                {auth.user.roles.join(', ') || 'no role assigned'}
                            </p>
                        </div>
                        <Link
                            href="/logout"
                            method="post"
                            as="button"
                            title="Log out"
                            className="flex size-6 shrink-0 items-center justify-center rounded-md text-green-200 hover:bg-white/10 hover:text-white"
                        >
                            <LogOut className="size-3.5" />
                        </Link>
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => setCollapsed((prev) => !prev)}
                    title={collapsed ? 'Expand sidebar' : undefined}
                    className="hidden w-full items-center gap-2.5 border-t border-white/10 px-2.5 py-2 text-sm font-medium text-green-200/80 transition-colors hover:bg-white/10 hover:text-white lg:flex"
                >
                    {collapsed ? <ChevronRight className="size-4 shrink-0" /> : <ChevronLeft className="size-4 shrink-0" />}
                    {!collapsed && <span>Collapse</span>}
                </button>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex h-13 shrink-0 items-center gap-3 border-b border-white/10 bg-green-900 px-4 lg:hidden">
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(true)}
                        aria-label="Open menu"
                        className="flex size-8 items-center justify-center rounded-md text-green-200 hover:bg-white/10 hover:text-white"
                    >
                        <Menu className="size-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <img src="/images/dict-logo.jpg" alt="DICT" className="size-6 shrink-0 rounded-md object-cover" />
                        <span className="text-sm font-semibold text-white">DICT Operations</span>
                    </div>
                </header>

                <main className={cn('flex-1 overflow-x-hidden', !fullBleed && 'p-4 sm:p-6')}>{children}</main>
            </div>
        </div>
    );
}
