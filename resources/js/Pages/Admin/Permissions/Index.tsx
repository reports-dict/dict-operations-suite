import PageHeader from '@/Components/PageHeader';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import Checkbox from '@/Components/ui/Checkbox';
import Combobox from '@/Components/ui/Combobox';
import Input from '@/Components/ui/Input';
import Label from '@/Components/ui/Label';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

type RoleName = 'admin' | 'bdd';

const ROLE_LABELS: Record<RoleName, string> = { admin: 'Admin', bdd: 'Bdd' };

interface ModuleRow {
    id: number;
    slug: string;
    name: string;
}

interface RoleRow {
    id: number;
    name: RoleName;
}

interface OverrideRow {
    user_id: number;
    name: string;
    username: string;
    module_id: number;
    module_name: string;
}

interface UserOption {
    id: number;
    name: string;
    username: string;
}

interface Props {
    modules: ModuleRow[];
    roles: RoleRow[];
    roleGrants: Record<string, number[]>;
    userOverrides: OverrideRow[];
    users: UserOption[];
}

export default function ModulePermissionsIndex({ modules, roles, roleGrants, userOverrides, users }: Props) {
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [saved, setSaved] = useState(false);
    const [overrideSearch, setOverrideSearch] = useState('');

    const filteredOverrides = useMemo(() => {
        const needle = overrideSearch.trim().toLowerCase();
        if (!needle) {
            return userOverrides;
        }

        return userOverrides.filter(
            (row) =>
                row.name.toLowerCase().includes(needle) ||
                row.username.toLowerCase().includes(needle) ||
                row.module_name.toLowerCase().includes(needle),
        );
    }, [userOverrides, overrideSearch]);

    const overridesForSelectedUser = useMemo(
        () => userOverrides.filter((o) => o.user_id === selectedUserId).map((o) => o.module_id),
        [userOverrides, selectedUserId],
    );

    const syncForm = useForm<{ module_ids: number[] }>({ module_ids: overridesForSelectedUser });

    useEffect(() => {
        syncForm.setData('module_ids', overridesForSelectedUser);
        setSaved(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedUserId, overridesForSelectedUser]);

    const selectedUser = users.find((u) => u.id === selectedUserId) ?? null;

    const toggleModuleForSelectedUser = (module: ModuleRow, checked: boolean) => {
        setSaved(false);
        syncForm.setData(
            'module_ids',
            checked ? [...syncForm.data.module_ids, module.id] : syncForm.data.module_ids.filter((id) => id !== module.id),
        );
    };

    const saveUserOverrides = () => {
        if (!selectedUserId) {
            return;
        }

        syncForm.patch(`/admin/permissions/users/${selectedUserId}/overrides`, {
            preserveScroll: true,
            onSuccess: () => setSaved(true),
        });
    };

    const toggleRoleGrant = (role: RoleRow, module: ModuleRow, granted: boolean) => {
        router.patch(
            `/admin/permissions/roles/${role.id}`,
            { module_id: module.id, granted },
            { preserveState: true, preserveScroll: true },
        );
    };

    const revokeOverride = (row: OverrideRow) => {
        if (!window.confirm(`Revoke ${row.username}'s access to ${row.module_name}?`)) {
            return;
        }

        router.delete(`/admin/permissions/users/${row.user_id}`, {
            data: { module_id: row.module_id },
            preserveScroll: true,
        });
    };

    return (
        <AppLayout>
            <Head title="Module Permissions" />

            <PageHeader
                title="Module Permission Management"
                description="Grant roles or individual users access to operations modules. A user override only adds access beyond their role — it can't take away what their role already grants."
            />

            <div className="mb-4 space-y-3 sm:hidden">
                {modules.map((module) => (
                    <Card key={module.id} className="p-3">
                        <p className="font-medium text-slate-900 dark:text-white">{module.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{module.slug}</p>

                        <div className="mt-2.5 space-y-1.5">
                            {roles.map((role) => (
                                <label key={role.id} className="flex items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-300">
                                    {ROLE_LABELS[role.name]}
                                    <Checkbox
                                        checked={roleGrants[role.name]?.includes(module.id) ?? false}
                                        onChange={(e) => toggleRoleGrant(role, module, e.target.checked)}
                                    />
                                </label>
                            ))}
                        </div>
                    </Card>
                ))}

                {modules.length === 0 && (
                    <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-600">No modules registered yet.</p>
                )}
            </div>

            <Card className="mb-4 hidden overflow-hidden sm:block">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800">
                                <th className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap text-slate-500 uppercase dark:text-slate-400">
                                    Module
                                </th>
                                {roles.map((role) => (
                                    <th
                                        key={role.id}
                                        className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap text-slate-500 uppercase dark:text-slate-400"
                                    >
                                        {ROLE_LABELS[role.name]}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {modules.map((module) => (
                                <tr key={module.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                        <p className="font-medium text-slate-900 dark:text-white">{module.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{module.slug}</p>
                                    </td>
                                    {roles.map((role) => (
                                        <td key={role.id} className="px-4 py-2.5 whitespace-nowrap">
                                            <Checkbox
                                                checked={roleGrants[role.name]?.includes(module.id) ?? false}
                                                onChange={(e) => toggleRoleGrant(role, module, e.target.checked)}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}

                            {modules.length === 0 && (
                                <tr>
                                    <td colSpan={1 + roles.length} className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-600">
                                        No modules registered yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Card className="mb-4 p-3">
                <p className="mb-3 text-sm font-medium text-slate-900 dark:text-white">Assign Modules</p>

                <div className="mb-3 w-full sm:w-72">
                    <Label htmlFor="override_user">User</Label>
                    <Combobox
                        id="override_user"
                        placeholder="Search user…"
                        options={users.map((user) => ({ id: user.id, label: user.name, sublabel: user.username }))}
                        value={selectedUserId}
                        onChange={(id) => setSelectedUserId(id)}
                    />
                </div>

                {selectedUser ? (
                    <>
                        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {modules.map((module) => (
                                <label
                                    key={module.id}
                                    className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-300"
                                >
                                    <Checkbox
                                        checked={syncForm.data.module_ids.includes(module.id)}
                                        onChange={(e) => toggleModuleForSelectedUser(module, e.target.checked)}
                                    />
                                    {module.name}
                                </label>
                            ))}
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                type="button"
                                variant="primary"
                                disabled={syncForm.processing}
                                onClick={saveUserOverrides}
                                className="w-full sm:w-auto"
                            >
                                Save Changes
                            </Button>
                            {saved && !syncForm.processing && <span className="text-xs text-green-600 dark:text-green-400">Saved</span>}
                        </div>
                    </>
                ) : (
                    <p className="text-sm text-slate-400 dark:text-slate-600">Search for a user above to assign their module overrides.</p>
                )}
            </Card>

            <div className="mb-3 w-full sm:w-72">
                <Label htmlFor="override_search">Search overrides</Label>
                <Input
                    id="override_search"
                    type="text"
                    placeholder="Filter by user or module…"
                    value={overrideSearch}
                    onChange={(e) => setOverrideSearch(e.target.value)}
                />
            </div>

            <div className="space-y-3 sm:hidden">
                {filteredOverrides.map((row) => (
                    <Card key={`${row.user_id}-${row.module_id}`} className="p-3">
                        <div className="flex items-start justify-between gap-2">
                            <button type="button" className="min-w-0 text-left" onClick={() => setSelectedUserId(row.user_id)}>
                                <p className="truncate font-medium text-slate-900 hover:underline dark:text-white">{row.name}</p>
                                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{row.username}</p>
                            </button>
                            <Button variant="danger" onClick={() => revokeOverride(row)}>
                                Revoke
                            </Button>
                        </div>
                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                            <span className="text-slate-400 dark:text-slate-500">Module: </span>
                            {row.module_name}
                        </p>
                    </Card>
                ))}

                {filteredOverrides.length === 0 && (
                    <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-600">
                        {userOverrides.length === 0 ? 'No active user overrides.' : 'No overrides match your search.'}
                    </p>
                )}
            </div>

            <Card className="hidden overflow-hidden sm:block">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800">
                                <th className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap text-slate-500 uppercase dark:text-slate-400">
                                    User
                                </th>
                                <th className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap text-slate-500 uppercase dark:text-slate-400">
                                    Module
                                </th>
                                <th className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap text-slate-500 uppercase dark:text-slate-400">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredOverrides.map((row) => (
                                <tr key={`${row.user_id}-${row.module_id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                        <button type="button" className="text-left" onClick={() => setSelectedUserId(row.user_id)}>
                                            <p className="font-medium text-slate-900 hover:underline dark:text-white">{row.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{row.username}</p>
                                        </button>
                                    </td>
                                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">{row.module_name}</td>
                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                        <Button variant="danger" onClick={() => revokeOverride(row)}>
                                            Revoke
                                        </Button>
                                    </td>
                                </tr>
                            ))}

                            {filteredOverrides.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-600">
                                        {userOverrides.length === 0 ? 'No active user overrides.' : 'No overrides match your search.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </AppLayout>
    );
}
