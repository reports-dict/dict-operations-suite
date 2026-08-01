import PageHeader from '@/Components/PageHeader';
import Badge from '@/Components/ui/Badge';
import Button from '@/Components/ui/Button';
import Card from '@/Components/ui/Card';
import Input from '@/Components/ui/Input';
import Label from '@/Components/ui/Label';
import Pagination, { PaginationLink } from '@/Components/ui/Pagination';
import Select from '@/Components/ui/Select';
import AppLayout from '@/Layouts/AppLayout';
import { SharedProps } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';

type Role = 'superadmin' | 'admin' | 'bdd';

interface UserRow {
    id: number;
    name: string;
    username: string;
    email: string;
    is_allowed: boolean;
    role: Role | null;
}

interface Paginated<T> {
    data: T[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
}

interface Filters {
    username: string | null;
    status: 'all' | 'allowed' | 'blocked';
    role: 'all' | Role;
}

interface Props {
    users: Paginated<UserRow>;
    filters: Filters;
}

const COLUMNS = ['User', 'Role', 'Status', 'Actions'];

export default function UserAccessIndex({ users, filters }: Props) {
    const { auth } = usePage<SharedProps>().props;

    const addUserForm = useForm({ username: '' });

    const submitAddUser: FormEventHandler = (e) => {
        e.preventDefault();
        addUserForm.post('/admin/users', {
            preserveScroll: true,
            onSuccess: () => addUserForm.reset(),
        });
    };

    const applyQuery = (overrides: Record<string, string | number | null>) => {
        router.get(
            '/admin/users',
            { ...filters, ...overrides, page: overrides.page ?? 1 },
            { preserveState: true, preserveScroll: true, only: ['users', 'filters'] },
        );
    };

    const updateRole = (userId: number, role: string) => {
        router.patch(`/admin/users/${userId}/role`, { role }, { preserveState: true, preserveScroll: true });
    };

    const toggleAccess = (row: UserRow) => {
        if (row.is_allowed && !window.confirm(`Block ${row.username}? They will be signed out immediately.`)) {
            return;
        }

        router.patch(`/admin/users/${row.id}/access`, { is_allowed: !row.is_allowed }, { preserveState: true, preserveScroll: true });
    };

    const deleteUser = (row: UserRow) => {
        if (!window.confirm(`Delete ${row.username}? This cannot be undone.`)) {
            return;
        }

        router.delete(`/admin/users/${row.id}`, { preserveScroll: true });
    };

    return (
        <AppLayout>
            <Head title="User Access" />

            <PageHeader title="User Access Management" description="Control who can log in and what role they have." />

            <Card className="mb-4 p-3">
                <form onSubmit={submitAddUser} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="w-full sm:w-56">
                        <Label htmlFor="new_username">Add user by username</Label>
                        <Input
                            id="new_username"
                            type="text"
                            placeholder="AD username"
                            value={addUserForm.data.username}
                            onChange={(e) => addUserForm.setData('username', e.target.value)}
                        />
                        {addUserForm.errors.username && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{addUserForm.errors.username}</p>
                        )}
                    </div>

                    <Button type="submit" variant="primary" disabled={addUserForm.processing} className="w-full sm:w-auto">
                        Add User
                    </Button>
                </form>
            </Card>

            <Card className="mb-4 p-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:max-w-2xl">
                    <div>
                        <Label htmlFor="username">Username</Label>
                        <Input
                            id="username"
                            type="text"
                            placeholder="Search username…"
                            value={filters.username ?? ''}
                            onChange={(e) => applyQuery({ username: e.target.value || null })}
                        />
                    </div>

                    <div>
                        <Label htmlFor="status">Status</Label>
                        <Select id="status" value={filters.status} onChange={(e) => applyQuery({ status: e.target.value })}>
                            <option value="all">All</option>
                            <option value="allowed">Allowed</option>
                            <option value="blocked">Blocked</option>
                        </Select>
                    </div>

                    <div>
                        <Label htmlFor="role">Role</Label>
                        <Select id="role" value={filters.role} onChange={(e) => applyQuery({ role: e.target.value })}>
                            <option value="all">All</option>
                            <option value="superadmin">Superadmin</option>
                            <option value="admin">Admin</option>
                            <option value="bdd">Bdd</option>
                        </Select>
                    </div>
                </div>
            </Card>

            <div className="space-y-3 sm:hidden">
                {users.data.map((row) => {
                    const isSelf = row.id === auth.user?.id;

                    return (
                        <Card key={row.id} className="p-3">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="truncate font-medium text-slate-900 dark:text-white">{row.name}</p>
                                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                        {row.username} &middot; {row.email}
                                    </p>
                                </div>
                                <Badge tone={row.is_allowed ? 'green' : 'amber'}>{row.is_allowed ? 'Allowed' : 'Blocked'}</Badge>
                            </div>

                            <div className="mt-2.5 flex items-center gap-2">
                                <Select
                                    className="flex-1"
                                    value={row.role ?? ''}
                                    disabled={isSelf}
                                    onChange={(e) => updateRole(row.id, e.target.value)}
                                >
                                    {!row.role && (
                                        <option value="" disabled>
                                            Select role…
                                        </option>
                                    )}
                                    <option value="superadmin">Superadmin</option>
                                    <option value="admin">Admin</option>
                                    <option value="bdd">Bdd</option>
                                </Select>
                                {!row.role && <Badge tone="neutral">Unassigned</Badge>}
                            </div>

                            <div className="mt-2.5 flex items-center gap-2">
                                <Button
                                    variant={row.is_allowed ? 'secondary' : 'primary'}
                                    disabled={isSelf}
                                    onClick={() => toggleAccess(row)}
                                    className="flex-1"
                                >
                                    {row.is_allowed ? 'Block' : 'Allow'}
                                </Button>
                                <Button variant="danger" disabled={isSelf} onClick={() => deleteUser(row)} className="flex-1">
                                    Delete
                                </Button>
                            </div>
                        </Card>
                    );
                })}

                {users.data.length === 0 && (
                    <p className="py-10 text-center text-sm text-slate-400 dark:text-slate-600">No users match the selected filters.</p>
                )}

                <Pagination links={users.links} from={users.from} to={users.to} total={users.total} />
            </div>

            <Card className="hidden overflow-hidden sm:block">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800">
                                {COLUMNS.map((label) => (
                                    <th
                                        key={label}
                                        className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap text-slate-500 uppercase dark:text-slate-400"
                                    >
                                        {label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {users.data.map((row) => {
                                const isSelf = row.id === auth.user?.id;

                                return (
                                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            <p className="font-medium text-slate-900 dark:text-white">{row.name}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {row.username} &middot; {row.email}
                                            </p>
                                        </td>
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Select
                                                    className="w-36"
                                                    value={row.role ?? ''}
                                                    disabled={isSelf}
                                                    onChange={(e) => updateRole(row.id, e.target.value)}
                                                >
                                                    {!row.role && (
                                                        <option value="" disabled>
                                                            Select role…
                                                        </option>
                                                    )}
                                                    <option value="superadmin">Superadmin</option>
                                                    <option value="admin">Admin</option>
                                                    <option value="bdd">Bdd</option>
                                                </Select>
                                                {!row.role && <Badge tone="neutral">Unassigned</Badge>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            <Badge tone={row.is_allowed ? 'green' : 'amber'}>{row.is_allowed ? 'Allowed' : 'Blocked'}</Badge>
                                        </td>
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant={row.is_allowed ? 'secondary' : 'primary'}
                                                    disabled={isSelf}
                                                    onClick={() => toggleAccess(row)}
                                                >
                                                    {row.is_allowed ? 'Block' : 'Allow'}
                                                </Button>
                                                <Button variant="danger" disabled={isSelf} onClick={() => deleteUser(row)}>
                                                    Delete
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}

                            {users.data.length === 0 && (
                                <tr>
                                    <td colSpan={COLUMNS.length} className="px-4 py-10 text-center text-sm text-slate-400 dark:text-slate-600">
                                        No users match the selected filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination links={users.links} from={users.from} to={users.to} total={users.total} />
            </Card>
        </AppLayout>
    );
}
