import { LucideIcon, Ship, Snowflake, Truck, UserCog, Users, Warehouse } from 'lucide-react';

// Single source of truth for both the sidebar nav (AppLayout.tsx) and the
// Modules landing page (Pages/Modules.tsx) - previously each hardcoded its
// own list and the two drifted (Modules.tsx was missing both Road Queue
// entries entirely). Still hardcoded rather than DB-driven: nav "shape"
// (expandable group w/ sub-items vs. flat link) and per-view descriptions
// don't exist in the `modules` table today - see CLAUDE.md's Frontend
// structure section before changing that.
//
// `key` here must match the `slug` column ModuleSeeder registers for each
// module 1:1 - moduleNavPermission() below derives the Spatie permission
// name from it the same way App\Models\Module::permissionName() does on the
// backend. Keep the two in sync when adding a module.
export interface ModuleNavChild {
    href: string;
    label: string;
}

interface ModuleNavBase {
    key: string;
    navLabel: string;
    cardName: string;
    description: string;
    icon: LucideIcon;
}

export interface FlatModuleNavEntry extends ModuleNavBase {
    shape: 'flat';
    href: string;
}

export interface GroupModuleNavEntry extends ModuleNavBase {
    shape: 'group';
    basePath: string;
    defaultHref: string;
    children: ModuleNavChild[];
}

export type ModuleNavEntry = FlatModuleNavEntry | GroupModuleNavEntry;

export function moduleNavPermission(entry: ModuleNavEntry): string {
    return `operations.${entry.key}.view`;
}

// `basePath` must end with a trailing slash - it's matched against the
// current URL with `startsWith()` in AppLayout.tsx, and without the slash
// '/operations/road-queue' would also match every '/operations/road-queue-ecd/...'
// URL (string-prefix collision), marking the wrong group "active"/expanded.
export const MODULE_NAV: ModuleNavEntry[] = [
    {
        key: 'reefer-plugin-report',
        navLabel: 'Reefer Plug-in',
        cardName: 'Reefer Plug-in Report',
        description: 'Hours reefer containers have been plugged in over a selected date range.',
        icon: Snowflake,
        shape: 'group',
        basePath: '/operations/reefer-plugin-report/',
        defaultHref: '/operations/reefer-plugin-report/per-container',
        children: [
            { href: '/operations/reefer-plugin-report/per-container', label: 'Per Container' },
            { href: '/operations/reefer-plugin-report/per-category', label: 'Per Category' },
        ],
    },
    {
        key: 'road-queue',
        navLabel: 'Road Queue (TML)',
        cardName: 'Road Queue (Terminal)',
        description: 'FCL import/export truck delivery queue - live board plus shift TAT history.',
        icon: Truck,
        shape: 'group',
        basePath: '/operations/road-queue/',
        defaultHref: '/operations/road-queue/history',
        children: [
            { href: '/operations/road-queue/board', label: 'Board' },
            { href: '/operations/road-queue/history', label: 'History' },
        ],
    },
    {
        key: 'road-queue-ecd',
        navLabel: 'Road Queue (ECD)',
        cardName: 'Road Queue (ECD)',
        description: 'Empty-container-to-storage-depot delivery queue - live board plus shift TAT history.',
        icon: Warehouse,
        shape: 'group',
        basePath: '/operations/road-queue-ecd/',
        defaultHref: '/operations/road-queue-ecd/history',
        children: [
            { href: '/operations/road-queue-ecd/board', label: 'Board' },
            { href: '/operations/road-queue-ecd/history', label: 'History' },
        ],
    },
    {
        key: 'consignees',
        navLabel: 'Consignees',
        cardName: 'Consignees',
        description: 'Consignee/customer reference list.',
        icon: Users,
        shape: 'flat',
        href: '/operations/consignees',
    },
    {
        key: 'driver-assignment',
        navLabel: 'Driver Assignment',
        cardName: 'Driver Assignment',
        description: 'Assign on-duty Prime Mover Drivers to trucks.',
        icon: UserCog,
        shape: 'flat',
        href: '/operations/driver-assignment',
    },
    {
        key: 'vessel-dashboard',
        navLabel: 'Vessel Dashboard',
        cardName: 'Vessel Dashboard',
        description: 'Live vessel visit board (cargo plans, discharge/load progress, crane moves) plus sync health and planned-figure overrides.',
        icon: Ship,
        shape: 'group',
        basePath: '/operations/vessel-dashboard/',
        defaultHref: '/operations/vessel-dashboard/management',
        children: [
            { href: '/operations/vessel-dashboard/board', label: 'Board' },
            { href: '/operations/vessel-dashboard/management', label: 'Management' },
        ],
    },
];
