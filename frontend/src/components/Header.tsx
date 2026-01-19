'use client';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { Menu, X, BookOpen, LogOut, LogIn, PenSquare, User, Bookmark, Bell } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useModules } from '@/contexts/ModuleContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { usePathname } from 'next/navigation';
import { SuccessDialog } from '@/components/SuccessDialog';
import { NotificationBell } from '@/components/NotificationBell';
import { useRouter } from 'next/navigation';
import { SearchBar } from '@/components/SearchBar';

interface HeaderProps {
  logoUrl?: string;
  brandName?: string;
}

export function Header({ logoUrl, brandName }: HeaderProps) {
  const { token, user, logout } = useAuth();
  const { disabled } = useModules();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [logoutSuccessOpen, setLogoutSuccessOpen] = useState(false);
  const unreadCount = 0; // TODO: Implement real notification count

  const displayName = brandName || "Projeto Ravenna";
  const displayUrl = "projetoravenna.cloud"; // Could also be dynamic if needed

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClick = () => setUserMenuOpen(false);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [userMenuOpen]);

  useEffect(() => {
    if (logoutSuccessOpen) {
      const t = setTimeout(() => {
        setLogoutSuccessOpen(false);
        router.push('/auth/login');
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [logoutSuccessOpen, router]);

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-border/10 backdrop-blur-md transition-all duration-300"
      style={{ backgroundColor: 'color-mix(in srgb, var(--header-bg) 95%, transparent)' }}
    >
      <div className="container-custom">
        <div className="flex h-16 items-center justify-between gap-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            {logoUrl ? (
              <img src={logoUrl} alt={displayName} className="h-8 object-contain" />
            ) : (
              <div className="p-1.5 rounded-lg bg-white/10 group-hover:bg-white/20 transition-colors">
                <BookOpen className="h-6 w-6 text-[var(--brand-primary)]" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight leading-none" style={{ color: 'var(--header-text)' }}>
                {displayName}
              </span>
              <span className="text-[10px] font-medium opacity-80" style={{ color: 'var(--header-text)' }}>
                {displayUrl}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation - Simplified */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/artigos"
              className={`text-sm font-medium transition-colors hover:text-[var(--brand-primary)] ${pathname === '/artigos' ? 'text-[var(--brand-primary)]' : ''}`}
              style={{ color: pathname === '/artigos' ? 'var(--brand-primary)' : 'var(--header-text)' }}
            >
              Artigos
            </Link>
          </nav>

          {/* Search Bar - Desktop */}
          <div className="hidden md:block flex-1 max-w-sm mx-4">
            <SearchBar placeholder="Buscar..." />
          </div>

          {/* Action Buttons & Auth - Desktop */}
          <div className="hidden md:flex items-center gap-3 pl-4 border-l border-white/5">
            <ThemeToggle />

            {token ? (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserMenuOpen(!userMenuOpen);
                  }}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-white/5 transition-all border border-transparent hover:border-white/10"
                  aria-label="Menu do usuário"
                >
                  <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-white font-bold text-xs ring-2 ring-transparent group-hover:ring-[var(--brand-primary)]/30 transition-all">
                    {user?.first_name?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <Menu className="h-4 w-4 opacity-40 text-[var(--header-text)]" />
                </button>

                {/* Profile Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-white dark:bg-[#1E2430] border border-border shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.7)] animate-in fade-in zoom-in duration-150 z-[60] overflow-hidden">
                    <div className="p-4 border-b border-border bg-[#F8F8F8] dark:bg-[#252B37]">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-white/10">
                          {user?.first_name?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <p className="text-sm font-bold truncate leading-tight text-foreground dark:text-white">
                            {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                          {user?.role || 'Membro'}
                        </span>
                      </div>
                    </div>

                    <div className="p-1.5">
                      <Link
                        href="/perfil"
                        className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl hover:bg-muted transition-colors group text-foreground dark:text-gray-200"
                      >
                        <User className="h-4 w-4 opacity-60 group-hover:opacity-100 group-hover:text-[var(--accent)]" />
                        <span className="font-medium">Meu Perfil</span>
                      </Link>

                      <Link
                        href="/admin/dashboard"
                        className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl hover:bg-muted transition-colors group text-foreground dark:text-gray-200"
                      >
                        <PenSquare className="h-4 w-4 opacity-60 group-hover:opacity-100 group-hover:text-[var(--accent)]" />
                        <span className="font-medium">Dashboard Admin</span>
                      </Link>

                      <Link
                        href="/favoritos"
                        className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl hover:bg-muted transition-colors group text-foreground dark:text-gray-200"
                      >
                        <Bookmark className="h-4 w-4 opacity-60 group-hover:opacity-100 group-hover:text-[var(--accent)]" />
                        <span className="font-medium">Salvos & Favoritos</span>
                      </Link>

                      <Link
                        href="/notificacoes"
                        className="flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl hover:bg-muted transition-colors group text-foreground dark:text-gray-200"
                      >
                        <div className="relative">
                          <Bell className="h-4 w-4 opacity-60 group-hover:opacity-100 group-hover:text-[var(--accent)]" />
                          {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-card" />
                          )}
                        </div>
                        <span className="font-medium">Notificações</span>
                        {unreadCount > 0 && (
                          <span className="ml-auto bg-red-500/10 text-red-500 text-[10px] font-bold px-1.5 rounded-md">
                            {unreadCount}
                          </span>
                        )}
                      </Link>
                    </div>

                    <div className="p-1.5 border-t border-border">
                      <button
                        onClick={() => setLogoutOpen(true)}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-sm text-red-500 rounded-xl hover:bg-red-500/5 transition-colors group"
                      >
                        <LogOut className="h-4 w-4 opacity-70 group-hover:opacity-100" />
                        <span className="font-semibold">Sair da conta</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              !pathname?.startsWith('/auth/login') && (
                <Link
                  href="/auth/login"
                  className="btn btn-primary btn-sm px-5 rounded-full font-bold shadow-lg shadow-[var(--brand-primary)]/20"
                >
                  Entrar
                </Link>
              )
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-3">
            <ThemeToggle />
            <button
              className="p-2 rounded-xl transition-colors hover:bg-white/5 border border-transparent active:scale-95"
              style={{ color: 'var(--header-text)' }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-6 border-t border-white/5 animate-in slide-in-from-top duration-300">
            {token && (
              <div className="px-4 mb-6 py-4 rounded-2xl bg-[#F8F8F8] dark:bg-[#252B37] border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[var(--brand-primary)] flex items-center justify-center text-white font-bold text-lg shadow-sm">
                    {user?.first_name?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="text-base font-bold truncate leading-tight">
                      {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </div>
              </div>
            )}

            <nav className="flex flex-col gap-1 px-2">
              <Link
                href="/artigos"
                className={`px-4 py-3 rounded-xl font-semibold transition-all flex items-center justify-between ${pathname === '/artigos' ? 'bg-muted text-[var(--accent)]' : 'hover:bg-muted text-foreground'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Artigos
              </Link>
              <Link
                href="/tags"
                className={`px-4 py-3 rounded-xl font-semibold transition-all flex items-center justify-between ${pathname === '/tags' ? 'bg-muted text-[var(--accent)]' : 'hover:bg-muted text-foreground'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Tags
              </Link>

              {token ? (
                <div className="mt-4 pt-4 border-t border-border space-y-1">
                  <p className="px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-2">Menu Pessoal</p>

                  <Link
                    href="/perfil"
                    className="flex gap-4 items-center px-4 py-3.5 hover:bg-muted rounded-xl transition-all font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="h-5 w-5 opacity-60" />
                    <span>Meu Perfil</span>
                  </Link>

                  <Link
                    href="/admin/dashboard"
                    className="flex gap-4 items-center px-4 py-3.5 hover:bg-muted rounded-xl transition-all font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <PenSquare className="h-5 w-5 opacity-60" />
                    <span>Dashboard Admin</span>
                  </Link>

                  <Link
                    href="/favoritos"
                    className="flex gap-4 items-center px-4 py-3.5 hover:bg-muted rounded-xl transition-all font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Bookmark className="h-5 w-5 opacity-60" />
                    <span>Favoritos</span>
                  </Link>

                  <Link
                    href="/notificacoes"
                    className="flex gap-4 items-center px-4 py-3.5 hover:bg-muted rounded-xl transition-all font-medium relative"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className="relative">
                      <Bell className="h-5 w-5 opacity-60" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background" />
                      )}
                    </div>
                    <span>Notificações</span>
                    {unreadCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </Link>

                  <button
                    onClick={() => setLogoutOpen(true)}
                    className="flex gap-4 items-center px-4 py-3.5 w-full text-left text-red-500 rounded-xl hover:bg-red-500/5 transition-all font-bold mt-2"
                  >
                    <LogOut className="h-5 w-5" />
                    Sair da conta
                  </button>
                </div>
              ) : (
                <div className="mt-6 px-4">
                  <Link
                    href="/auth/login"
                    className="btn btn-primary w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold shadow-lg shadow-[var(--brand-primary)]/20"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <LogIn className="h-5 w-5" />
                    Acessar Conta
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}

        <ConfirmDialog
          open={logoutOpen}
          title="Sair da conta"
          description="Tem certeza que deseja sair com segurança do sistema?"
          onCancel={() => setLogoutOpen(false)}
          onConfirm={() => {
            logout();
            setLogoutOpen(false);
            setMobileMenuOpen(false);
            setLogoutSuccessOpen(true);
          }}
        />

        <SuccessDialog
          open={logoutSuccessOpen}
          title="Sessão encerrada"
          description="Você saiu com segurança. Até breve!"
          onClose={() => {
            setLogoutSuccessOpen(false);
            router.push('/auth/login');
          }}
        />
      </div>
    </header>
  );
}
