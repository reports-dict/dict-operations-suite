import Button from '@/Components/ui/Button';
import Input from '@/Components/ui/Input';
import Label from '@/Components/ui/Label';
import { MODULE_NAV } from '@/lib/modules';
import { Head, Link, useForm } from '@inertiajs/react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { FormEventHandler } from 'react';

// Derived from MODULE_NAV (resources/js/lib/modules.ts), same as BOARD_LINKS
// below - so this list can't drift out of sync as modules are added/removed.
const FEATURES = [
    ...MODULE_NAV.map((entry) => ({ icon: entry.icon, label: entry.cardName })),
    { icon: ShieldCheck, label: 'Role-based module access' },
];

// Derived from MODULE_NAV (resources/js/lib/modules.ts) rather than a third
// hardcoded list - naturally yields just the two public Road Queue boards,
// since only their groups have a child labeled "Board".
const BOARD_LINKS = MODULE_NAV.flatMap((entry) =>
    entry.shape === 'group'
        ? entry.children.filter((child) => child.label === 'Board').map((child) => ({ name: entry.cardName, href: child.href }))
        : [],
);

export default function Login({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm({
        username: '',
        password: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post('/login');
    };

    const year = new Date().getFullYear();

    return (
        <div className="flex min-h-screen flex-col lg:flex-row">
            <Head title="Log in" />

            {/* Brand panel */}
            <div className="relative flex shrink-0 flex-col overflow-hidden bg-black px-6 py-8 sm:px-10 sm:py-10 lg:w-1/2 lg:px-14 lg:py-12 xl:w-3/5">
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: "url('/images/dict-background.avif')" }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/70 to-green-950/60 lg:bg-gradient-to-br lg:from-black/90 lg:via-black/75 lg:to-green-950/50" />

                <img
                    src="/images/dict-logo.jpg"
                    alt="DICT"
                    className="relative w-24 rounded-xl object-cover shadow-md ring-1 ring-white/20 sm:w-28 lg:w-32 xl:w-36"
                />

                <div className="relative flex flex-1 flex-col justify-center py-10 lg:py-0">
                    <span className="mb-3 inline-flex w-fit items-center rounded-full bg-green-500/15 px-2.5 py-1 text-[11px] font-medium text-green-300 ring-1 ring-green-500/30">
                        Internal Reporting Platform
                    </span>

                    <h1 className="max-w-md text-xl leading-snug font-semibold text-white sm:text-2xl lg:text-3xl">
                        Port operations, reported in real time.
                    </h1>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-300 lg:mt-3 lg:text-[15px]">
                        Centralized operations reporting for Davao International Container Terminal, Inc. — starting with reefer plug-in
                        hours, built on live SPARCS N4 data.
                    </p>

                    <ul className="mt-6 space-y-2.5 lg:mt-8">
                        {FEATURES.map(({ icon: Icon, label }) => (
                            <li key={label} className="flex items-center gap-2.5 text-sm text-slate-200">
                                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-green-500/15 text-green-400">
                                    <Icon className="size-3.5" strokeWidth={2} />
                                </span>
                                {label}
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="relative hidden text-xs text-slate-400 lg:block">&copy; {year} Davao International Container Terminal, Inc.</p>
            </div>

            {/* Form panel */}
            <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950 sm:px-6">
                <div className="w-full max-w-sm">
                    <div className="mb-6 text-center lg:text-left">
                        <h1 className="text-[clamp(1.125rem,2vw,1.5rem)] leading-snug font-bold tracking-wide text-slate-900 uppercase dark:text-white">
                            DICT Operations Suite
                        </h1>
                        <h2 className="mt-2 text-base font-semibold text-slate-900 dark:text-white">Sign in</h2>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Use your Active Directory account</p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
                        {status === 'pending-approval' && (
                            <div className="mb-4 flex items-start gap-2 rounded-md bg-red-50 p-3 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-400">
                                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                                <span>Your account isn&apos;t allowed to log in yet. Contact a superadmin to request access.</span>
                            </div>
                        )}

                        <form onSubmit={submit} className="space-y-3.5">
                            <div>
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    type="text"
                                    autoFocus
                                    autoComplete="username"
                                    value={data.username}
                                    onChange={(e) => setData('username', e.target.value)}
                                />
                                {errors.username && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.username}</p>}
                            </div>

                            <div>
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    autoComplete="current-password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                />
                                {errors.password && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.password}</p>}
                            </div>

                            <Button type="submit" variant="primary" size="md" disabled={processing} className="w-full">
                                Log in
                            </Button>
                        </form>
                    </div>

                    <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-600">
                        Need access? Contact a superadmin to request it.
                    </p>

                    <p className="mt-3 text-center text-xs text-slate-400 dark:text-slate-600">
                        Live boards:{' '}
                        {BOARD_LINKS.map((link, i) => (
                            <span key={link.href}>
                                {i > 0 && ' · '}
                                <Link href={link.href} className="text-green-600 hover:underline dark:text-green-400">
                                    {link.name}
                                </Link>
                            </span>
                        ))}
                    </p>

                    <p className="mt-3 text-center text-xs text-slate-400 lg:hidden dark:text-slate-600">
                        &copy; {year} Davao International Container Terminal, Inc.
                    </p>
                </div>
            </div>
        </div>
    );
}
