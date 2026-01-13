'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
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

export default function SecurityPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');

    const { data: users, isLoading } = useQuery<User[]>({
        queryKey: ['users-list'],
        queryFn: async () => {
            // Mock data - replace with real API
            return [
                {
                    id: '1',
                    email: 'admin@ravenna.com',
                    first_name: 'Admin',
                    last_name: 'Principal',
                    is_active: true,
                    is_staff: true,
                    date_joined: '2024-01-15T10:00:00Z',
                    last_login: '2024-01-13T14:30:00Z'
                },
                {
                    id: '2',
                    email: 'editor@ravenna.com',
                    first_name: 'Editor',
                    last_name: 'Conteúdo',
                    is_active: true,
                    is_staff: false,
                    date_joined: '2024-02-20T10:00:00Z',
                    last_login: '2024-01-13T12:15:00Z'
                },
                {
                    id: '3',
                    email: 'user@example.com',
                    first_name: 'João',
                    last_name: 'Silva',
                    is_active: true,
                    is_staff: false,
                    date_joined: '2024-03-10T10:00:00Z',
                    last_login: '2024-01-10T09:00:00Z'
                },
                {
                    id: '4',
                    email: 'inactive@example.com',
                    first_name: 'Maria',
                    last_name: 'Santos',
                    is_active: false,
                    is_staff: false,
                    date_joined: '2024-01-05T10:00:00Z',
                    last_login: null
                },
            ];
        },
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
                                        {user.is_staff ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-500">
                                                <Shield className="h-3 w-3" />
                                                Admin
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500">
                                                <Users className="h-3 w-3" />
                                                Usuário
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.is_active ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500">
                                                <CheckCircle className="h-3 w-3" />
                                                Ativo
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-500">
                                                <XCircle className="h-3 w-3" />
                                                Inativo
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            {formatDate(user.last_login)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                                            <MoreVertical className="h-4 w-4" />
                                        </button>
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

            {/* Info Box */}
            <div className="p-6 bg-blue-500/5 rounded-2xl border border-blue-500/10 flex items-start gap-4">
                <AlertTriangle className="h-6 w-6 text-blue-500 shrink-0 mt-1" />
                <div>
                    <h4 className="font-bold text-blue-500 mb-2">Gestão Completa de Usuários</h4>
                    <p className="text-sm text-blue-500/80">
                        Esta interface permite visualizar todos os usuários cadastrados.
                        Para ações avançadas (edição, exclusão, alteração de permissões),
                        utilize o Django Admin em <code className="bg-blue-500/10 px-1 rounded">/admin</code>.
                    </p>
                </div>
            </div>
        </div>
    );
}
