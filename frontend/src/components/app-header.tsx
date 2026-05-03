"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useEffect, useState } from "react";

const navLinks = [
  { href: "/blog",              label: "Blog",       icon: "✦" },
  { href: "/forum",             label: "Fórum",      icon: "◈" },
  { href: "/game-data/quests",  label: "Missões",    icon: "📜" },
  { href: "/leaderboard",       label: "Ranking",    icon: "⚔" },
];

export function AppHeader() {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const u = (user ?? null) as Record<string, unknown> | null;
  const isLoggedIn = Boolean(user) && !isLoading;
  const isAdmin = Boolean(u?.is_admin);
  const isEditor = Boolean(u?.is_blog_editor);
  const isMod = Boolean(u?.is_forum_moderator);
  const canSeeDashboard = (isAdmin || isEditor || isMod) && !isLoading;
  const heroName = String(u?.display_name || u?.username || "Herói");

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled || menuOpen
            ? "bg-[#050508]/95 backdrop-blur-2xl border-b border-[var(--rv-border)]"
            : "bg-transparent"
        }`}
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--rv-accent)] to-transparent opacity-60" />

        <div className="mx-auto flex h-16 sm:h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div className="relative h-8 w-8 sm:h-9 sm:w-9">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[var(--rv-accent)] to-[var(--rv-cyan)] opacity-80 group-hover:opacity-100 transition-opacity rv-glow-purple" />
              <div className="absolute inset-[2px] rounded-[5px] bg-[var(--rv-black)] flex items-center justify-center">
                <span className="text-[var(--rv-accent)] font-black text-xs">R</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="rv-display text-base sm:text-lg text-white leading-none tracking-wider">RAVENNA</span>
              <span className="rv-label text-[7px] sm:text-[9px] text-[var(--rv-text-dim)] tracking-[0.35em]">UNIVERSE</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`group flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 rv-label text-xs ${
                    active
                      ? "bg-[var(--rv-accent-glow)] text-[var(--rv-accent)] border border-[var(--rv-border-hover)]"
                      : "text-[var(--rv-text-muted)] hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className={active ? "text-[var(--rv-accent)]" : "text-[var(--rv-text-dim)] group-hover:text-[var(--rv-accent)]"}>
                    {link.icon}
                  </span>
                  {link.label}
                </Link>
              );
            })}
            {isLoggedIn && (
              <Link
                href="/me"
                className={`group flex items-center gap-2 px-4 py-2 rounded-xl transition-all rv-label text-xs ${
                  pathname === "/me"
                    ? "bg-[var(--rv-accent-glow)] text-[var(--rv-accent)] border border-[var(--rv-border-hover)]"
                    : "text-[var(--rv-text-muted)] hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="text-[var(--rv-gold)]">◆</span>
                Hub
              </Link>
            )}
            {isLoggedIn && (
              <Link
                href="/play"
                className={`group flex items-center gap-2 px-4 py-2 rounded-xl transition-all rv-label text-xs border ${
                  pathname === "/play"
                    ? "bg-[var(--rv-accent)] text-white border-[var(--rv-accent)]"
                    : "text-[var(--rv-accent)] border-[var(--rv-accent)]/30 hover:bg-[var(--rv-accent)]/10 hover:border-[var(--rv-accent)]/60"
                }`}
              >
                <span>⚔</span>
                Jogar
              </Link>
            )}
            {canSeeDashboard && (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-4 py-2 rounded-xl rv-label text-xs text-[var(--rv-cyan)] hover:bg-[var(--rv-cyan-glow)] transition-all border border-transparent hover:border-[var(--rv-cyan)]/20"
              >
                <span>⬡</span>
                {isAdmin ? "Console" : "Panel"}
              </Link>
            )}
          </nav>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-3">
            {isLoading ? (
              <div className="h-4 w-16 animate-pulse rounded-full bg-white/10" />
            ) : !user ? (
              <>
                <Link href="/login" className="rv-btn rv-btn-ghost text-xs px-5 h-10">
                  Entrar
                </Link>
                <Link href="/register" className="rv-btn rv-btn-primary text-xs px-5 h-10">
                  Criar Conta
                </Link>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/me"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--rv-border)] bg-[var(--rv-surface)] hover:border-[var(--rv-border-hover)] transition-all"
                >
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[var(--rv-accent)] to-[var(--rv-cyan)] flex items-center justify-center text-white font-black text-xs flex-shrink-0">
                    {heroName[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-[var(--rv-text-primary)] max-w-[100px] truncate">
                    {heroName}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="h-9 w-9 rounded-xl border border-[var(--rv-border)] bg-[var(--rv-surface)] text-[var(--rv-text-muted)] hover:text-[var(--rv-red)] hover:border-[var(--rv-red)]/30 transition-all flex items-center justify-center"
                  title="Sair"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Mobile: right side */}
          <div className="flex md:hidden items-center gap-3">
            {!isLoading && !user && (
              <Link href="/login" className="rv-btn rv-btn-primary text-xs px-4 h-9">
                Entrar
              </Link>
            )}
            {!isLoading && user && (
              <Link href="/me" className="h-9 w-9 rounded-full bg-gradient-to-br from-[var(--rv-accent)] to-[var(--rv-cyan)] flex items-center justify-center text-white font-black text-sm">
                {heroName[0].toUpperCase()}
              </Link>
            )}
            {/* Hamburger */}
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="h-9 w-9 rounded-xl border border-[var(--rv-border)] bg-[var(--rv-surface)] flex items-center justify-center transition-all hover:border-[var(--rv-border-hover)]"
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            >
              <div className="flex flex-col gap-1.5 w-4">
                <span className={`h-[2px] bg-[var(--rv-text-muted)] rounded-full transition-all duration-300 ${menuOpen ? "rotate-45 translate-y-[7px]" : ""}`} />
                <span className={`h-[2px] bg-[var(--rv-text-muted)] rounded-full transition-all duration-300 ${menuOpen ? "opacity-0" : ""}`} />
                <span className={`h-[2px] bg-[var(--rv-text-muted)] rounded-full transition-all duration-300 ${menuOpen ? "-rotate-45 -translate-y-[7px]" : ""}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ${menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
          <nav className="border-t border-[var(--rv-border)] px-4 py-4 flex flex-col gap-1">
            {navLinks.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all rv-label text-xs ${
                    active
                      ? "bg-[var(--rv-accent-glow)] text-[var(--rv-accent)] border border-[var(--rv-border-hover)]"
                      : "text-[var(--rv-text-muted)] hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className={active ? "text-[var(--rv-accent)]" : "text-[var(--rv-text-dim)]"}>{link.icon}</span>
                  {link.label}
                </Link>
              );
            })}
            {isLoggedIn && (
              <Link href="/me"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all rv-label text-xs ${
                  pathname === "/me" ? "bg-[var(--rv-accent-glow)] text-[var(--rv-accent)] border border-[var(--rv-border-hover)]" : "text-[var(--rv-text-muted)] hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="text-[var(--rv-gold)]">◆</span>
                Player Hub
              </Link>
            )}
            {isLoggedIn && (
              <Link href="/play"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all rv-label text-xs border ${
                  pathname === "/play"
                    ? "bg-[var(--rv-accent)] text-white border-[var(--rv-accent)]"
                    : "text-[var(--rv-accent)] border-[var(--rv-accent)]/30 hover:bg-[var(--rv-accent)]/10"
                }`}
              >
                <span>⚔</span>
                Jogar
              </Link>
            )}
            {canSeeDashboard && (
              <Link href="/dashboard"
                className="flex items-center gap-3 px-4 py-3 rounded-xl rv-label text-xs text-[var(--rv-cyan)] hover:bg-[var(--rv-cyan-glow)] transition-all">
                <span>⬡</span>
                {isAdmin ? "Console" : "Panel"}
              </Link>
            )}
            {isLoggedIn && (
              <button
                type="button"
                onClick={() => void logout()}
                className="flex items-center gap-3 px-4 py-3 rounded-xl rv-label text-xs text-[var(--rv-red)] hover:bg-[var(--rv-red-glow)] transition-all w-full text-left"
              >
                <span>→</span> Sair
              </button>
            )}
            {!isLoading && !user && (
              <Link href="/register" className="rv-btn rv-btn-primary w-full h-11 mt-2 text-xs">
                Criar Conta Grátis
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Overlay for mobile menu */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
    </>
  );
}
