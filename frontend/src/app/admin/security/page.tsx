'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import {
    Shield,
    Users,
    Search,
    MoreVertical,
    CheckCircle,
    AlertCircle,
    Download,
    UserPlus,
    ShieldCheck,
    Settings,
    Trash2,
    ChevronLeft,
    ChevronRight,
    ShieldAlert,
    X,
    Loader2
} from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface User {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    username: string;
    is_active: boolean;
    is_staff: boolean;
    date_joined: string;
    last_login: string | null;
}

interface PaginatedUsers {
    count: number;
    next: string | null;
    previous: string | null;
    results: User[];
}

export default function SecurityPage() {
    const t = useTranslations('Admin');
    const { show } = useToast();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('created_at_desc');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const { data: usersData, isLoading } = useQuery<PaginatedUsers>({
        queryKey: ['users', searchTerm, sortBy, page, pageSize],
        queryFn: async () => {
            const resp = await api.get('/accounts/users/', {
                params: {
                    search: searchTerm,
                    ordering: sortBy === 'created_at_desc' ? '-created_at' :
                        sortBy === 'created_at_asc' ? 'created_at' :
                            sortBy === 'last_login_desc' ? '-last_login' :
                                sortBy === 'last_login_asc' ? 'last_login' :
                                    sortBy === 'name_asc' ? 'first_name' :
                                        sortBy === 'name_desc' ? '-first_name' :
                                            sortBy === 'email_asc' ? 'email' :
                                                sortBy === 'email_desc' ? '-email' :
                                                    sortBy === 'is_staff_desc' ? '-is_staff' :
                                                        sortBy === 'is_staff_asc' ? 'is_staff' :
                                                            sortBy === 'is_active_desc' ? '-is_active' :
                                                                sortBy === 'is_active_asc' ? 'is_active' :
                                                                    '-created_at',
                    page,
                    page_size: pageSize
                }
            });
            return resp.data;
        }
    });

    const exportCsv = () => {
        // Mock CSV Export logic
        show({ type: 'success', message: t('csvExported') });
    };

    const toggleStatusMutation = useMutation({
        mutationFn: async ({ userId, active }: { userId: number; active: boolean }) => {
            return api.patch(`/accounts/users/${userId}/`, { is_active: active });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            show({ type: 'success', message: t('userToggleSuccess') });
        },
        onError: () => {
            show({ type: 'error', message: t('userSaveError') });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (userId: number) => {
            return api.delete(`/accounts/users/${userId}/`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            show({ type: 'success', message: t('userDeleteSuccess') });
        },
        onError: () => {
            show({ type: 'error', message: t('userDeleteError') });
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">{t('security')}</h1>
                    <p className="text-muted-foreground">{t('securitySubtitle')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={exportCsv}
                        className="btn btn-outline btn-sm flex items-center gap-2"
                    >
                        <Download className="h-4 w-4" />
                        {t('exportCsv')}
                    </button>
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="btn btn-primary btn-sm flex items-center gap-2 shadow-lg hover:shadow-primary/20"
                    >
                        <UserPlus className="h-4 w-4" />
                        {t('newUser')}
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">{t('totalUsers')}</p>
                        <p className="text-xl font-bold">{usersData?.count || 0}</p>
                    </div>
                </div>
                <div className="card p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                        <ShieldCheck className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">{t('administrators')}</p>
                        <p className="text-xl font-bold">{usersData?.results.filter(u => u.is_staff).length || 0}</p>
                    </div>
                </div>
                <div className="card p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">{t('activeUsers')}</p>
                        <p className="text-xl font-bold">{usersData?.results.filter(u => u.is_active).length || 0}</p>
                    </div>
                </div>
                <div className="card p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                        <AlertCircle className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-muted-foreground">{t('inactiveUsers')}</p>
                        <p className="text-xl font-bold">{usersData?.results.filter(u => !u.is_active).length || 0}</p>
                    </div>
                </div>
            </div>

            <div className="card overflow-hidden">
                {/* Filters */}
                <div className="p-4 border-b border-border bg-muted/30 flex flex-col md:flex-row gap-4 justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder={t('searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-accent outline-none"
                        />
                    </div>
                    <div className="flex gap-2">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="px-3 py-2 bg-background border border-border rounded-lg outline-none text-sm"
                        >
                            <option value="created_at_desc">{t('sortCreatedDesc')}</option>
                            <option value="created_at_asc">{t('sortCreatedAsc')}</option>
                            <option value="last_login_desc">{t('sortLoginDesc')}</option>
                            <option value="last_login_asc">{t('sortLoginAsc')}</option>
                            <option value="name_asc">{t('sortNameAsc')}</option>
                            <option value="name_desc">{t('sortNameDesc')}</option>
                            <option value="email_asc">{t('sortEmailAsc')}</option>
                            <option value="email_desc">{t('sortEmailDesc')}</option>
                            <option value="is_staff_desc">{t('sortAdminDesc')}</option>
                            <option value="is_staff_asc">{t('sortAdminAsc')}</option>
                            <option value="is_active_desc">{t('sortStatusDesc')}</option>
                            <option value="is_active_asc">{t('sortStatusAsc')}</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/50 text-xs uppercase text-muted-foreground font-semibold">
                                <th className="px-6 py-4">{t('tableUser')}</th>
                                <th className="px-6 py-4">{t('tableRole')}</th>
                                <th className="px-6 py-4">{t('tableStatus')}</th>
                                <th className="px-6 py-4">{t('tableLastAccess')}</th>
                                <th className="px-6 py-4 text-right">{t('tableActions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-muted" />
                                                <div className="space-y-2">
                                                    <div className="h-4 w-32 bg-muted rounded" />
                                                    <div className="h-3 w-48 bg-muted rounded" />
                                                </div>
                                            </div>
                                        </td>
                                        <td colSpan={4} className="px-6 py-4" />
                                    </tr>
                                ))
                            ) : usersData?.results.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                        <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                        {t('noUsersFound')}
                                    </td>
                                </tr>
                            ) : (
                                usersData?.results.map((user) => (
                                    <tr key={user.id} className="hover:bg-muted/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold ring-2 ring-background ring-offset-2 ring-offset-border">
                                                    {user.first_name?.[0]?.toUpperCase() || user.username[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-sm">
                                                        {user.first_name} {user.last_name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {user.email} • <span className="font-mono">@{user.username}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.is_staff ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-500/10 text-purple-600 text-[10px] font-bold uppercase tracking-wider">
                                                    <ShieldCheck className="h-3 w-3" />
                                                    {t('roleAdmin')}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10 text-blue-600 text-[10px] font-bold uppercase tracking-wider">
                                                    <Users className="h-3 w-3" />
                                                    {t('roleUser')}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => toggleStatusMutation.mutate({ userId: user.id, active: !user.is_active })}
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${user.is_active
                                                        ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                                                        : 'bg-red-500/10 text-red-600 hover:bg-red-500/20'
                                                    }`}
                                            >
                                                <span className={`h-1.5 w-1.5 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                                                {user.is_active ? t('statusActive') : t('statusInactive')}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-muted-foreground">
                                            {user.last_login ? new Date(user.last_login).toLocaleString() : t('never')}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setIsEditOpen(true);
                                                    }}
                                                    className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-accent transition-colors"
                                                    title={t('editUser')}
                                                >
                                                    <Settings className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm(t('confirmDelete'))) {
                                                            deleteMutation.mutate(user.id);
                                                        }
                                                    }}
                                                    className="p-2 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between text-sm text-muted-foreground">
                    <div>
                        {t('total', { count: usersData?.count || 0 })}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={page === 1}
                            onClick={() => setPage(p => p - 1)}
                            className="p-2 hover:bg-card rounded border border-border disabled:opacity-30 transition-colors"
                            title={t('prevPage')}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="px-4 py-2 bg-card rounded border border-border font-medium">
                            {page}
                        </span>
                        <button
                            disabled={!usersData?.next}
                            onClick={() => setPage(p => p + 1)}
                            className="p-2 hover:bg-card rounded border border-border disabled:opacity-30 transition-colors"
                            title={t('nextPage')}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Info Message */}
            <div className="p-4 bg-accent/5 border border-accent/10 rounded-xl flex gap-3">
                <ShieldAlert className="h-5 w-5 text-accent shrink-0" />
                <div className="text-sm">
                    <p className="font-bold text-accent">{t('securityNoticeTitle')}</p>
                    <p className="text-accent/80 italic">
                        {t('securityNoticeDesc')}
                    </p>
                </div>
            </div>

            {/* User Modals */}
            <UserModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={() => {
                    setIsCreateOpen(false);
                    queryClient.invalidateQueries({ queryKey: ['users'] });
                }}
            />

            {selectedUser && (
                <UserModal
                    isOpen={isEditOpen}
                    user={selectedUser}
                    onClose={() => {
                        setIsEditOpen(false);
                        setSelectedUser(null);
                    }}
                    onSuccess={() => {
                        setIsEditOpen(false);
                        setSelectedUser(null);
                        queryClient.invalidateQueries({ queryKey: ['users'] });
                    }}
                />
            )}
        </div>
    );
}

function UserModal({ isOpen, onClose, onSuccess, user }: { isOpen: boolean; onClose: () => void; onSuccess: () => void; user?: User }) {
    const t = useTranslations('Admin');
    const { show } = useToast();
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        username: user?.username || '',
        email: user?.email || '',
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        password: '',
        is_staff: user?.is_staff || false,
        is_active: user?.is_active ?? true,
    });

    const mutation = useMutation({
        mutationFn: async (data: typeof formData) => {
            if (user) {
                const payload = { ...data };
                if (!payload.password) delete (payload as any).password;
                return api.patch(`/accounts/users/${user.id}/`, payload);
            }
            return api.post('/accounts/users/', data);
        },
        onSuccess: () => {
            show({ type: 'success', message: t('userSaveSuccess') });
            onSuccess();
        },
        onError: (error: any) => {
            show({ type: 'error', message: error.response?.data?.detail || t('userSaveError') });
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-background w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-border animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
                    <h2 className="text-xl font-bold">{user ? t('editUser') : t('newUser')}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-muted-foreground">{t('firstName')}</label>
                            <input
                                required
                                value={formData.first_name}
                                onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-accent outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-muted-foreground">{t('lastName')}</label>
                            <input
                                required
                                value={formData.last_name}
                                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-accent outline-none"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase text-muted-foreground">Email</label>
                        <input
                            required
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-accent outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-muted-foreground">{t('username')}</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                                <input
                                    required
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full pl-8 pr-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-accent outline-none font-mono"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase text-muted-foreground">
                                {t('password')} <span className="text-[10px] font-normal lowercase">{user ? t('passwordOptional') : t('passwordRequired')}</span>
                            </label>
                            <input
                                required={!user}
                                type="password"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-border bg-background focus:ring-2 focus:ring-accent outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-border">
                        <label className="flex-1 flex items-center justify-center gap-3 p-3 rounded-xl border border-border bg-muted/50 cursor-pointer hover:bg-muted transition-colors">
                            <input
                                type="checkbox"
                                checked={formData.is_staff}
                                onChange={e => setFormData({ ...formData, is_staff: e.target.checked })}
                                className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                            />
                            <div className="flex flex-col">
                                <span className="text-sm font-bold uppercase tracking-tight">{t('roleAdmin')}</span>
                                <span className="text-[10px] text-muted-foreground">{t('groups')} & {t('permissions')}</span>
                            </div>
                        </label>

                        <label className="flex-1 flex items-center justify-center gap-3 p-3 rounded-xl border border-border bg-muted/50 cursor-pointer hover:bg-muted transition-colors">
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                            />
                            <div className="flex flex-col">
                                <span className="text-sm font-bold uppercase tracking-tight">{t('statusActive')}</span>
                                <span className="text-[10px] text-muted-foreground">{t('tableStatus')}</span>
                            </div>
                        </label>
                    </div>

                    <div className="flex gap-2 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-outline flex-1"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="btn btn-primary flex-1 shadow-lg shadow-primary/20"
                        >
                            {mutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                            ) : (
                                t('save')
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
