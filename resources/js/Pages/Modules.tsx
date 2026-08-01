import Card from '@/Components/ui/Card';
import AppLayout from '@/Layouts/AppLayout';
import { MODULE_NAV, moduleNavPermission } from '@/lib/modules';
import { SharedProps } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';

export default function Modules() {
    const { auth } = usePage<SharedProps>().props;
    const firstName = auth.user?.name.split(' ')[0];

    const isSuperadmin = auth.user?.roles.includes('superadmin') ?? false;
    const userPermissions = auth.user?.permissions ?? [];
    const visibleModuleNav = MODULE_NAV.filter(
        (entry) => isSuperadmin || userPermissions.includes(moduleNavPermission(entry)),
    );

    return (
        <AppLayout>
            <Head title="Modules" />

            <div className="relative mb-6 overflow-hidden rounded-xl">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: "url('/images/dict-background.avif')" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/65 to-green-950/40" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-transparent" />

                <div className="relative flex min-h-[180px] flex-col justify-between gap-6 p-5 sm:min-h-[220px] sm:p-8">
                    <div className="inline-flex w-fit rounded-lg bg-white p-2 shadow-lg">
                        <img src="/images/dict-logo.jpg" alt="DICT" className="h-8 w-auto sm:h-10" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white sm:text-3xl">Modules</h1>
                        <p className="mt-1 max-w-xl text-sm text-slate-200/90 sm:text-base">
                            {firstName ? `Welcome back, ${firstName}. ` : ''}Pick a module to get started.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {visibleModuleNav.map((entry) => {
                    const Icon = entry.icon;
                    const href = entry.shape === 'flat' ? entry.href : entry.defaultHref;

                    return (
                        <Link
                            key={entry.key}
                            href={href}
                            className="rounded-lg outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600"
                        >
                            <Card className="group flex h-full flex-col p-4 transition-all duration-200 ease-out hover:-translate-y-1 hover:border-green-300 hover:shadow-lg active:translate-y-0 active:scale-[0.98] active:shadow-sm active:duration-75 dark:hover:border-green-700">
                                <div className="mb-3 flex size-8 items-center justify-center rounded-md bg-green-50 text-green-600 transition-transform duration-200 group-hover:scale-110 dark:bg-green-500/10 dark:text-green-400">
                                    <Icon className="size-4" strokeWidth={2} />
                                </div>
                                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{entry.cardName}</h2>
                                <p className="mt-1 flex-1 text-xs text-slate-500 dark:text-slate-400">{entry.description}</p>
                                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                                    Open
                                    <ArrowRight className="size-3 transition-transform duration-200 group-hover:translate-x-1" />
                                </span>
                            </Card>
                        </Link>
                    );
                })}
            </div>
        </AppLayout>
    );
}
