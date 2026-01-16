'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import {
    Shield,
    Users,
    Lock,
    UserCheck,
    Search,
    Filter,
    MoreVertical,
    Mail,
    Calendar,
    CheckCircle,
    XCircle,
    AlertTriangle
} from 'lucide-react';
import { useState } from 'react';

interface User {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    is_active: boolean;
    is_staff: boolean;
    date_joined: string;
    last_login: string | null;
}
interface Paginated<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}
interface Group {
    id: number;
    name: string;
}
interface Permission {
    id: number;
    name: string;
    codename: string;
    content_type: string | null;
}
export default function SecurityPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [openModal, setOpenModal] = useState(false);
    const [editing, setEditing] = useState<User | null>(null);
    const [form, setForm] = useState<{ email: string; password: string; first_name: string; last_name: string; username?: string; is_staff: boolean; is_active: boolean; groups?: number[]; user_permissions?: number[] }>({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        username: '',
        is_staff: false,
        is_active: true,
        groups: [],
        user_permissions: [],
    });
    const queryClient = useQueryClient();
    const { show } = useToast();

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [ordering, setOrdering] = useState<string>('date_joined');
    const [groupFilter, setGroupFilter] = useState<number | null>(null);
    const [permFilter, setPermFilter] = useState<number | null>(null);
    const { data: usersPage, isLoading } = useQuery<Paginated<User>>({
        queryKey: ['users-list', searchTerm, filterRole, page, pageSize, ordering, groupFilter, permFilter],
        queryFn: async () => {
            const resp = await api.get('/users/', {
                params: {
                    q: searchTerm || undefined,
                    role: filterRole !== 'all' ? filterRole : undefined,
                    page,
                    page_size: pageSize,
                    ordering,
                    group: groupFilter || undefined,
                    perm: permFilter || undefined,
                }
            });
            return resp.data;
        },
        staleTime: 5000,
    });
    const users = usersPage?.results || [];
    const { data: groups } = useQuery<Group[]>({
        queryKey: ['auth-groups'],
        queryFn: async () => {
            const { data } = await api.get('/auth/groups/');
            return data;
        }
    });
    const { data: permissions } = useQuery<Permission[]>({
        queryKey: ['auth-permissions'],
        queryFn: async () => {
            const { data } = await api.get('/auth/permissions/');
            return data;
        }
    });

    const createMutation = useMutation({
        mutationFn: async () => {
            const payload: any = { ...form };
            if (!editing) {
                // require password on create
                if (!payload.password) throw new Error('Senha é obrigatória');
            } else {
                // password optional on update
                if (!payload.password) delete payload.password;
            }
            if (editing) {
                const { data } = await api.patch(`/users/${editing.id}/`, payload);
                return data;
            }
            const { data } = await api.post('/users/', payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users-list'] });
            setOpenModal(false);
            setEditing(null);
            setForm({ email: '', password: '', first_name: '', last_name: '', username: '', is_staff: false, is_active: true, groups: [], user_permissions: [] });
            show({ type: 'success', message: 'Usuário salvo com sucesso' });
        },
        onError: (e: any) => {
            show({ type: 'error', message: e?.response?.data?.detail || 'Erro ao salvar usuário' });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (userId: string) => {
            await api.delete(`/users/${userId}/`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users-list'] });
            show({ type: 'success', message: 'Usuário excluído' });
        },
        onError: () => {
            show({ type: 'error', message: 'Erro ao excluir usuário' });
        }
    });

    const toggleMutation = useMutation({
        mutationFn: async (payload: { id: string; patch: Partial<User> }) => {
            const { data } = await api.patch(`/users/${payload.id}/`, payload.patch);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users-list'] });
            show({ type: 'success', message: 'Alteração aplicada' });
        }
    });

    const filteredUsers = users?.filter(user => {
        const matchesSearch =
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesRole =
            filterRole === 'all' ||
            (filterRole === 'admin' && user.is_staff) ||
            (filterRole === 'user' && !user.is_staff) ||
            (filterRole === 'inactive' && !user.is_active);

        return matchesSearch && matchesRole;
    });

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Nunca';
        return new Date(dateString).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (isLoading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-12 w-64 bg-muted rounded" />
                <div className="h-64 bg-muted rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight">Segurança & Acesso</h1>
                <p className="text-muted-foreground">Gerenciamento de usuários, permissões e auditoria do sistema</p>
            </div>
            <div className="flex gap-2">
                <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                        setEditing(null);
                        setForm({ email: '', password: '', first_name: '', last_name: '', username: '', is_staff: false, is_active: true, groups: [], user_permissions: [] });
                        setOpenModal(true);
                    }}
                >
                    Novo Usuário
                </button>
                <button
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                        const rows = filteredUsers.map(u => [
                            u.email,
                            u.first_name,
                            u.last_name,
                            u.is_staff ? 'admin' : 'user',
                            u.is_active ? 'active' : 'inactive',
                            u.date_joined,
                            u.last_login || ''
                        ]);
                        const header = ['email', 'first_name', 'last_name', 'role', 'status', 'date_joined', 'last_login'];
                        const csv = [header, ...rows].map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(',')).join('\n');
                        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `users-export-${Date.now()}.csv`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        show({ type: 'success', message: 'CSV exportado' });
                    }}
                >
                    Exportar CSV
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="card p-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Users className="h-5 w-5 text-blue-500" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold">{users?.length || 0}</h3>
                    <p className="text-sm text-muted-foreground">Total de Usuários</p>
                </div>

                <div className="card p-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                            <Shield className="h-5 w-5 text-purple-500" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold">{users?.filter(u => u.is_staff).length || 0}</h3>
                    <p className="text-sm text-muted-foreground">Administradores</p>
                </div>

                <div className="card p-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                            <CheckCircle className="h-5 w-5 text-emerald-500" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold">{users?.filter(u => u.is_active).length || 0}</h3>
                    <p className="text-sm text-muted-foreground">Usuários Ativos</p>
                </div>

                <div className="card p-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="p-2 bg-red-500/10 rounded-lg">
                            <XCircle className="h-5 w-5 text-red-500" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-bold">{users?.filter(u => !u.is_active).length || 0}</h3>
                    <p className="text-sm text-muted-foreground">Inativos</p>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="card p-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background"
                        />
                    </div>
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="px-4 py-2 rounded-lg border border-border bg-background"
                    >
                        <option value="all">Todos os usuários</option>
                        <option value="admin">Administradores</option>
                        <option value="user">Usuários</option>
                        <option value="inactive">Inativos</option>
                    </select>
                    <select
                        value={groupFilter ?? ''}
                        onChange={(e) => setGroupFilter(e.target.value ? Number(e.target.value) : null)}
                        className="px-4 py-2 rounded-lg border border-border bg-background"
                    >
                        <option value="">Todos os grupos</option>
                        {groups?.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    <select
                        value={permFilter ?? ''}
                        onChange={(e) => setPermFilter(e.target.value ? Number(e.target.value) : null)}
                        className="px-4 py-2 rounded-lg border border-border bg-background"
                    >
                        <option value="">Todas as permissões</option>
                        {permissions?.map(p => <option key={p.id} value={p.id}>{p.codename}</option>)}
                    </select>
                    <select
                        value={ordering}
                        onChange={(e) => setOrdering(e.target.value)}
                        className="px-4 py-2 rounded-lg border border-border bg-background"
                    >
                        <option value="date_joined">Criado (asc)</option>
                        <option value="-date_joined">Criado (desc)</option>
                        <option value="last_login">Último login (asc)</option>
                        <option value="-last_login">Último login (desc)</option>
                        <option value="first_name">Nome (asc)</option>
                        <option value="-first_name">Nome (desc)</option>
                        <option value="email">Email (asc)</option>
                        <option value="-email">Email (desc)</option>
                        <option value="is_staff">Admin (asc)</option>
                        <option value="-is_staff">Admin (desc)</option>
                        <option value="is_active">Ativo (asc)</option>
                        <option value="-is_active">Ativo (desc)</option>
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/50 border-b border-border">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Usuário</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Email</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Função</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Último Acesso</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredUsers?.map((user) => (
                                <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                                                <span className="text-sm font-bold text-accent">
                                                    {user.first_name[0]}{user.last_name[0]}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium">{user.first_name} {user.last_name}</p>
                                                <p className="text-xs text-muted-foreground">ID: {user.id}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm">{user.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${user.is_staff ? 'bg-purple-500/10 text-purple-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                {user.is_staff ? <Shield className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                                                {user.is_staff ? 'Admin' : 'Usuário'}
                                            </span>
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={user.is_staff}
                                                onChange={(e) => toggleMutation.mutate({ id: user.id, patch: { is_staff: e.target.checked } })}
                                            />
                                        </label>
                                    </td>
                                    <td className="px-6 py-4">
                                        <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${user.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {user.is_active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                                {user.is_active ? 'Ativo' : 'Inativo'}
                                            </span>
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={user.is_active}
                                                onChange={(e) => toggleMutation.mutate({ id: user.id, patch: { is_active: e.target.checked } })}
                                            />
                                        </label>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            {formatDate(user.last_login)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                                                onClick={() => {
                                                setEditing(user);
                                                setForm({
                                                        email: user.email,
                                                        password: '',
                                                        first_name: user.first_name,
                                                        last_name: user.last_name,
                                                        username: (user as any).username || '',
                                                        is_staff: user.is_staff,
                                                        is_active: user.is_active,
                                                    groups: (user as any).groups || [],
                                                    user_permissions: (user as any).user_permissions || [],
                                                    });
                                                    setOpenModal(true);
                                                }}
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </button>
                                            <button
                                                className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                                                onClick={() => {
                                                    if (confirm('Excluir este usuário?')) {
                                                        deleteMutation.mutate(user.id);
                                                    }
                                                }}
                                            >
                                                <XCircle className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredUsers?.length === 0 && (
                    <div className="p-12 text-center">
                        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <p className="text-muted-foreground">Nenhum usuário encontrado</p>
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                    {usersPage ? `Total: ${usersPage.count}` : ''}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        className="btn btn-outline btn-sm"
                        disabled={!usersPage?.previous}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                        Página anterior
                    </button>
                    <span className="text-sm">{page}</span>
                    <button
                        className="btn btn-outline btn-sm"
                        disabled={!usersPage?.next}
                        onClick={() => setPage((p) => p + 1)}
                    >
                        Próxima página
                    </button>
                    <select
                        className="ml-2 px-2 py-1 rounded border border-border bg-background text-sm"
                        value={pageSize}
                        onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                    >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                    </select>
                </div>
            </div>

            {/* Modal Create/Edit */}
            {openModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6">
                        <h3 className="text-lg font-bold mb-4">{editing ? 'Editar Usuário' : 'Novo Usuário'}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold mb-2">Nome</label>
                                <input
                                    type="text"
                                    value={form.first_name}
                                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-border bg-background"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-2">Sobrenome</label>
                                <input
                                    type="text"
                                    value={form.last_name}
                                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-border bg-background"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold mb-2">Email</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-border bg-background"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold mb-2">Username</label>
                                <input
                                    type="text"
                                    value={form.username || ''}
                                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-border bg-background"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold mb-2">Senha {editing ? '(opcional)' : '(obrigatória)'}</label>
                                <input
                                    type="password"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-border bg-background"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-2">Admin</label>
                                <input
                                    type="checkbox"
                                    checked={form.is_staff}
                                    onChange={(e) => setForm({ ...form, is_staff: e.target.checked })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-2">Ativo</label>
                                <input
                                    type="checkbox"
                                    checked={form.is_active}
                                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold mb-2">Grupos</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {groups?.map((g) => {
                                        const selected = (form.groups || []).includes(g.id);
                                        return (
                                            <label key={g.id} className="flex items-center gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onChange={(e) => {
                                                        const curr = form.groups || [];
                                                        const next = e.target.checked ? [...curr, g.id] : curr.filter((id) => id !== g.id);
                                                        setForm({ ...form, groups: next });
                                                    }}
                                                />
                                                {g.name}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold mb-2">Permissões</label>
                                <div className="max-h-40 overflow-auto border border-border rounded-lg p-2">
                                    {permissions?.map((p) => {
                                        const selected = (form.user_permissions || []).includes(p.id);
                                        return (
                                            <label key={p.id} className="flex items-center gap-2 text-xs py-1">
                                                <input
                                                    type="checkbox"
                                                    checked={selected}
                                                    onChange={(e) => {
                                                        const curr = form.user_permissions || [];
                                                        const next = e.target.checked ? [...curr, p.id] : curr.filter((id) => id !== p.id);
                                                        setForm({ ...form, user_permissions: next });
                                                    }}
                                                />
                                                <span className="font-mono">{p.codename}</span>
                                                <span className="opacity-60">({p.content_type || 'global'})</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex gap-3 justify-end">
                            <button className="btn btn-outline" onClick={() => { setOpenModal(false); setEditing(null); }}>
                                Cancelar
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={() => createMutation.mutate()}
                                disabled={createMutation.isPending}
                            >
                                {createMutation.isPending ? 'Salvando...' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Info Box */}
            <div className="p-6 bg-blue-500/5 rounded-2xl border border-blue-500/10 flex items-start gap-4">
                <AlertTriangle className="h-6 w-6 text-blue-500 shrink-0 mt-1" />
                <div>
                    <h4 className="font-bold text-blue-500 mb-2">Gestão Completa de Usuários</h4>
                    <p className="text-sm text-blue-500/80">
                        Esta interface permite visualizar e gerenciar usuários e permissões. Para ações avançadas,
                        utilize o Django Admin em <code className="bg-blue-500/10 px-1 rounded">/admin</code>.
                    </p>
                </div>
            </div>
        </div>
    );
}
