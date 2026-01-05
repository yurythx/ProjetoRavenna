'use client';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { Menu, X, BookOpen, LogOut, LogIn, PenSquare, User } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useModules } from '@/contexts/ModuleContext';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { usePathname } from 'next/navigation';
import { SuccessDialog } from '@/components/SuccessDialog';
import { NotificationBell } from '@/components/NotificationBell';
import { useRouter } from 'next/navigation';

export function Header() {
  const { token, logout } = useAuth();
  const { disabled } = useModules();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [logoutSuccessOpen, setLogoutSuccessOpen] = useState(false);
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
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-1.5 rounded-lg bg-white/10 group-hover:bg-white/20 transition-colors">
              <BookOpen className="h-6 w-6 text-[var(--django-green-primary)]" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight leading-none" style={{ color: 'var(--header-text)' }}>
                Projeto Ravenna
              </span>
              <span className="text-[10px] font-medium opacity-80" style={{ color: 'var(--header-text)' }}>
                projetoravenna.cloud
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/artigos"
              className="text-sm font-medium transition-colors hover:text-[var(--django-green-primary)]"
              style={{ color: 'var(--header-text)' }}
            >
              Artigos
            </Link>
            {token && (
              <Link
                href="/perfil"
                className="text-sm font-medium transition-colors hover:text-[var(--django-green-primary)] flex items-center gap-1"
                style={{ color: 'var(--header-text)' }}
              >
                <User className="h-4 w-4" />
                Perfil
              </Link>
            )}
            {token && (
              <Link
                href="/admin/dashboard"
                className="text-sm font-medium transition-colors hover:text-[var(--django-green-primary)]"
                style={{ color: 'var(--header-text)' }}
              >
                Dashboard
              </Link>
            )}
            {token && !disabled['articles'] && (
              <Link
                href="/artigos/new"
                className="btn btn-primary flex items-center gap-2 shadow-sm hover:shadow-md transition-all"
              >
                <PenSquare className="h-4 w-4" />
                Novo Artigo
              </Link>
            )}
          </nav>

          {/* Auth Section - Desktop */}
          <div className="hidden md:flex items-center gap-4 pl-4 border-l border-white/10">
            <ThemeToggle />
            {token && <NotificationBell />}
            {token && (
              <span className="px-2 py-1 text-xs font-semibold rounded-full" style={{ background: 'var(--accent)', color: 'white' }}>
                Administrador
              </span>
            )}
            {token ? (
              <button
                onClick={() => setLogoutOpen(true)}
                className="btn btn-outline flex items-center gap-2 border-white/20 hover:bg-white/10 text-[var(--header-text)]"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </button>
            ) : (
              !pathname?.startsWith('/auth/login') && (
                <Link
                  href="/auth/login"
                  className="btn btn-primary flex items-center gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  Entrar
                </Link>
              )
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-4">
            <ThemeToggle />
            {token && (
              <span className="px-2 py-1 text-xs font-semibold rounded-full" style={{ background: 'var(--accent)', color: 'white' }}>
                Administrador
              </span>
            )}
            <button
              className="p-2 rounded-lg transition-colors hover:bg-white/10"
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
          <div className="md:hidden py-4 border-t border-white/10 animate-fade-in">
            <nav className="flex flex-col gap-2">
              <Link
                href="/artigos"
                className="px-4 py-3 rounded-lg font-medium transition-colors hover:bg-white/10"
                style={{ color: 'var(--header-text)' }}
                onClick={() => setMobileMenuOpen(false)}
              >
                Artigos
              </Link>
              {token && (
                <div className="px-4 py-2">
                  <NotificationBell />
                </div>
              )}
              {token && (
                <Link
                  href="/perfil"
                  className="px-4 py-3 rounded-lg font-medium transition-colors hover:bg-white/10 flex items-center gap-2"
                  style={{ color: 'var(--header-text)' }}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="h-4 w-4" />
                  Perfil
                </Link>
              )}
              {token ? (
                <>
                  <Link
                    href="/artigos/new"
                    className="px-4 py-3 rounded-lg font-medium transition-colors hover:bg-white/10 flex items-center gap-2"
                    style={{ color: 'var(--header-text)' }}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <PenSquare className="h-4 w-4" />
                    Novo Artigo
                  </Link>
                  <button
                    onClick={() => setLogoutOpen(true)}
                    className="px-4 py-3 w-full text-left rounded-lg font-medium transition-colors hover:bg-white/10 flex items-center gap-2"
                    style={{ color: 'var(--header-text)' }}
                  >
                    <LogOut className="h-4 w-4" />
                    Sair
                  </button>
                </>
              ) : (
                <Link
                  href="/auth/login"
                  className="mx-4 mt-2 btn btn-primary flex items-center justify-center gap-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <LogIn className="h-4 w-4" />
                  Entrar
                </Link>
              )}
            </nav>
          </div>
        )}
        <ConfirmDialog
          open={logoutOpen}
          title="Sair da conta"
          description="Tem certeza que deseja sair?"
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
          description="Você saiu do sistema com sucesso."
          onClose={() => {
            setLogoutSuccessOpen(false);
            router.push('/auth/login');
          }}
        />
      </div>
    </header>
  );
}
