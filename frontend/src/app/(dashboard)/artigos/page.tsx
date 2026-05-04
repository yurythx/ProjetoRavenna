/**
 * @module ArticlesAdminPage
 * 
 * Gestão administrativa de artigos do Blog com estética Premium RV.
 */
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ── Types ────────────────────────────────────────────────────────────────────

type Article = {
  id: string;
  title: string;
  category_name: string;
  author_name: string;
  status: "draft" | "published" | "archived";
  created_at: string;
  view_count: number;
};

// ── Data Fetch ───────────────────────────────────────────────────────────────

async function fetchArticles() {
  const res = await fetch("/api/v1/blog/posts/?page=1");
  if (!res.ok) throw new Error("Erro ao carregar posts");
  return res.json();
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ArticlesAdminPage() {
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-articles"],
    queryFn: fetchArticles,
  });

  const articles = (data?.results || []) as Article[];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ── Header ── */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="rv-badge rv-badge-purple">ADMINISTRAÇÃO</span>
            <span className="rv-badge rv-badge-cyan">BLOG</span>
          </div>
          <h1 className="rv-display text-4xl text-white">Gestão de Conteúdo</h1>
          <p className="text-[var(--rv-text-muted)] mt-1 text-sm max-w-xl">
            Crie, edite e gerencie as notícias, patch notes e a lore de Ravenna.
          </p>
        </div>

        <Link 
          href="/dashboard/blog/novo" 
          className="rv-btn rv-btn-primary px-8 h-12 text-sm flex-shrink-0"
        >
          <span className="text-lg mr-2">+</span> Novo Artigo
        </Link>
      </header>

      {/* ── Filters & Search ── */}
      <div className="rv-card p-4 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--rv-text-dim)]">🔍</span>
          <input 
            type="text" 
            placeholder="Buscar por título ou autor..."
            className="w-full bg-[var(--rv-surface-2)] border border-[var(--rv-border)] rounded-xl pl-11 pr-4 h-11 text-sm text-white focus:border-[var(--rv-accent)] outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <select className="bg-[var(--rv-surface-2)] border border-[var(--rv-border)] rounded-xl px-4 h-11 text-xs text-[var(--rv-text-dim)] outline-none focus:border-[var(--rv-accent)] cursor-pointer">
            <option>Todas Categorias</option>
            <option>Patch Notes</option>
            <option>Lore</option>
          </select>
          <select className="bg-[var(--rv-surface-2)] border border-[var(--rv-border)] rounded-xl px-4 h-11 text-xs text-[var(--rv-text-dim)] outline-none focus:border-[var(--rv-accent)] cursor-pointer">
            <option>Todos Status</option>
            <option>Publicado</option>
            <option>Rascunho</option>
          </select>
        </div>
      </div>

      {/* ── Articles Table/Grid ── */}
      <div className="rv-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-[var(--rv-border)]">
                <th className="px-6 py-4 rv-label text-[10px] text-[var(--rv-text-dim)] tracking-widest">ARTIGO</th>
                <th className="px-6 py-4 rv-label text-[10px] text-[var(--rv-text-dim)] tracking-widest">CATEGORIA</th>
                <th className="px-6 py-4 rv-label text-[10px] text-[var(--rv-text-dim)] tracking-widest">STATUS</th>
                <th className="px-6 py-4 rv-label text-[10px] text-[var(--rv-text-dim)] tracking-widest">DATA</th>
                <th className="px-6 py-4 rv-label text-[10px] text-[var(--rv-text-dim)] tracking-widest text-right">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--rv-border)]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-8 w-8 rounded-full border-2 border-[var(--rv-accent)] border-t-transparent animate-spin" />
                      <span className="rv-label text-[10px] text-[var(--rv-text-dim)] tracking-widest">CARREGANDO ARQUIVOS...</span>
                    </div>
                  </td>
                </tr>
              ) : articles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <p className="text-[var(--rv-text-dim)] text-sm">Nenhum artigo encontrado.</p>
                  </td>
                </tr>
              ) : (
                articles.map((art) => (
                  <tr key={art.id} className="group hover:bg-white/[0.01] transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="text-white font-medium text-sm group-hover:text-[var(--rv-accent)] transition-colors line-clamp-1">
                          {art.title}
                        </span>
                        <span className="text-[10px] text-[var(--rv-text-dim)] mt-0.5">por {art.author_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="rv-label text-[9px] px-2 py-1 rounded-md bg-[var(--rv-surface-2)] border border-[var(--rv-border)] text-[var(--rv-text-muted)]">
                        {art.category_name}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`rv-badge text-[9px] ${
                        art.status === 'published' ? 'rv-badge-cyan' : 
                        art.status === 'draft' ? 'rv-badge-purple' : 'rv-badge-red'
                      }`}>
                        {art.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-[11px] text-[var(--rv-text-dim)]">
                        {format(new Date(art.created_at), "dd MMM, yyyy", { locale: ptBR })}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="h-8 w-8 rounded-lg bg-[var(--rv-surface-2)] border border-[var(--rv-border)] flex items-center justify-center text-[var(--rv-text-dim)] hover:text-white hover:border-[var(--rv-accent)] transition-all">
                          ✏️
                        </button>
                        <button className="h-8 w-8 rounded-lg bg-red-500/5 border border-red-500/20 flex items-center justify-center text-red-500/50 hover:text-red-500 hover:bg-red-500/10 transition-all">
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* ── Pagination Footer ── */}
        <div className="px-6 py-4 bg-white/[0.02] border-t border-[var(--rv-border)] flex items-center justify-between">
          <span className="rv-label text-[10px] text-[var(--rv-text-dim)]">
            MOSTRANDO {articles.length} DE {data?.count || 0} ARTIGOS
          </span>
          <div className="flex gap-1">
            <button className="h-8 px-3 rounded-lg border border-[var(--rv-border)] text-[var(--rv-text-dim)] text-[10px] rv-label hover:bg-white/5 transition-all">ANTERIOR</button>
            <button className="h-8 px-3 rounded-lg border border-[var(--rv-accent)] bg-[var(--rv-accent)]/10 text-[var(--rv-accent)] text-[10px] rv-label">1</button>
            <button className="h-8 px-3 rounded-lg border border-[var(--rv-border)] text-[var(--rv-text-dim)] text-[10px] rv-label hover:bg-white/5 transition-all">PRÓXIMO</button>
          </div>
        </div>
      </div>
    </div>
  );
}
