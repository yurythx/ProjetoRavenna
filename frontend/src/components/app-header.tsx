"use client";

import Link from "next/link";
import { AuthStatus } from "@/components/auth-status";
import { useAuth } from "@/components/auth-provider";
import { motion } from "framer-motion";

export function AppHeader() {
  const { user, isLoading } = useAuth();
  const u = (user ?? null) as Record<string, unknown> | null;
  const isLoggedIn = Boolean(user) && !isLoading;
  const isAdmin = Boolean(u?.is_admin);
  const isEditor = Boolean(u?.is_blog_editor);
  const isForumModerator = Boolean(u?.is_forum_moderator);
  const canSeeDashboard = (isAdmin || isEditor || isForumModerator) && !isLoading;

  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/60 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-10">
          <Link href="/" className="group flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 shadow-lg shadow-purple-500/20" />
            <span className="text-lg font-black tracking-tighter text-white">RAVENNA</span>
          </Link>
          
          <nav className="hidden items-center gap-8 text-[11px] font-black uppercase tracking-widest text-gray-400 md:flex">
            <Link href="/blog" className="hover:text-white transition-colors">
              Blog
            </Link>
            <Link href="/forum" className="hover:text-white transition-colors">
              Fórum
            </Link>
            {isLoggedIn ? (
              <Link href="/me" className="hover:text-white transition-colors">
                Player Hub
              </Link>
            ) : null}
            {canSeeDashboard ? (
              <Link href="/dashboard" className="text-purple-400 hover:text-purple-300 transition-colors">
                {isAdmin ? "Admin Console" : "Dashboard"}
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <AuthStatus />
        </div>
      </div>
    </motion.header>
  );
}
