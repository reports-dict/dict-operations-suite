import PageHeader from '@/Components/PageHeader';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import Checkbox from '@/Components/ui/Checkbox';
import Label from '@/Components/ui/Label';
import Select from '@/Components/ui/Select';
import AppLayout from '@/Layouts/AppLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

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
    const grantForm = useForm({ user_id: '', module_id: '' });

    const submitGrant: FormEventHandler = (e) => {
        e.preventDefault();
        grantForm.post('/admin/permissions/users', {
            preserveScroll: true,
            onSuccess: () => grantForm.reset(),
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
                <form onSubmit={submitGrant} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="w-full sm:w-56">
                        <Label htmlFor="override_user">User</Label>
                        <Select
                            id="override_user"
                            value={grantForm.data.user_id}
                            onChange={(e) => grantForm.setData('user_id', e.target.value)}
                        >
                            <option value="" disabled>
                                Select user…
                            </option>
                            {users.map((user) => (
                                <option key={user.id} value={user.id}>
                                    {user.username}
                                </option>
                            ))}
                        </Select>
                        {grantForm.errors.user_id && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{grantForm.errors.user_id}</p>}
                    </div>

                    <div className="w-full sm:w-56">
                        <Label htmlFor="override_module">Module</Label>
                        <Select
                            id="override_module"
                            value={grantForm.data.module_id}
                            onChange={(e) => grantForm.setData('module_id', e.target.value)}
                        >
                            <option value="" disabled>
                                Select module…
                            </option>
                            {modules.map((module) => (
                                <option key={module.id} value={module.id}>
                                    {module.name}
                                </option>
                            ))}
                        </Select>
                        {grantForm.errors.module_id && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{grantForm.errors.module_id}</p>
                        )}
                    </div>

                    <Button type="submit" variant="primary" disabled={grantForm.processing} className="w-full sm:w-auto">
                        Grant Access
                    </Button>
                </form>
            </Card>

            <div className="space-y-3 sm:hidden">
                {userOverrides.map((row) => (
                    <Card key={`${row.user_id}-${row.module_id}`} className="p-3">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <p className="truncate font-medium text-slate-900 dark:text-white">{row.name}</p>
                                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{row.username}</p>
                            </div>
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

                {userOverrides.length === 0 && (
                    <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-600">No active user overrides.</p>
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
                            {userOverrides.map((row) => (
                                <tr key={`${row.user_id}-${row.module_id}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                        <p className="font-medium text-slate-900 dark:text-white">{row.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{row.username}</p>
                                    </td>
                                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-600 dark:text-slate-300">{row.module_name}</td>
                                    <td className="px-4 py-2.5 whitespace-nowrap">
                                        <Button variant="danger" onClick={() => revokeOverride(row)}>
                                            Revoke
                                        </Button>
                                    </td>
                                </tr>
                            ))}

                            {userOverrides.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-600">
                                        No active user overrides.
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
