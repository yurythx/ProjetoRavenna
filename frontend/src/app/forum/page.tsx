import Link from "next/link";
import type { Metadata } from "next";
import { backendFetch } from "@/lib/backend";
import { ForumHeaderActions } from "@/app/forum/forum-header-actions";
import { RecentTopicsList } from "./recent-topics-list";

type Paginated<T> = { count: number; next: string | null; previous: string | null; results: T[] };
type ForumCategory = {
  id: string; name: string; slug: string; description: string;
  icon: string | null; topic_count: number; reply_count: number;
};

export const metadata: Metadata = {
  title: "Fórum | RAVENNA",
  description: "Discuta estratégias, reporte bugs e conheça outros heróis de Ravenna.",
  alternates: { canonical: "/forum" },
};

export default async function ForumPage() {
  const categoriesRes = await backendFetch<Paginated<ForumCategory>>(
    "/api/v1/forum/public/categories/?page=1&page_size=50",
    { method: "GET", next: { revalidate: 300 } }
  );
  const categories = categoriesRes.ok ? categoriesRes.data.results : [];
  const totalTopics = categories.reduce((s, c) => s + c.topic_count, 0);
  const totalReplies = categories.reduce((s, c) => s + c.reply_count, 0);

  return (
    <div className="relative min-h-screen">
      {/* Ambient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="rv-orb rv-animate-pulse-glow" style={{ width: "500px", height: "500px", top: "-15%", left: "-10%", background: "var(--rv-accent)", opacity: 0.18 }} />
        <div className="rv-orb" style={{ width: "300px", height: "300px", bottom: "10%", right: "-5%", background: "var(--rv-cyan)", opacity: 0.12 }} />
      </div>

      {/* ── Hero ── */}
      <section className="relative border-b border-[var(--rv-border)] bg-gradient-to-b from-[var(--rv-surface)]/60 to-transparent">
        <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100'%3E%3Cpath d='M28 66L0 50V18L28 2l28 16v32L28 66zm0-2l26-15V19L28 4 2 19v30l26 15z' fill='none' stroke='%2306b6d4' stroke-width='1'/%3E%3C/svg%3E\")" }}
        />
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:py-20 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div>
              <span className="rv-badge rv-badge-cyan mb-4 inline-flex">◈ Arena da Comunidade</span>
              <h1 className="rv-display text-4xl sm:text-5xl md:text-6xl text-white">Fórum &amp;<br />Discussões</h1>
              <p className="mt-4 text-[var(--rv-text-muted)] max-w-lg text-sm sm:text-base" style={{ fontFamily: "var(--font-body)" }}>
                Onde heróis debatem estratégias, relatam suas batalhas e forjam alianças.
              </p>
            </div>
            <ForumHeaderActions newTopicHref="/forum/new" />
          </div>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-3 gap-3 max-w-xs sm:max-w-sm">
            {[
              { val: String(categories.length), label: "Categorias" },
              { val: totalTopics > 0 ? String(totalTopics) : "—", label: "Tópicos" },
              { val: totalReplies > 0 ? String(totalReplies) : "—", label: "Respostas" },
            ].map((s) => (
              <div key={s.label} className="rv-card p-3 sm:p-4 text-center">
                <div className="rv-display text-lg sm:text-xl text-[var(--rv-accent)]">{s.val}</div>
                <div className="rv-label text-[8px] sm:text-[9px] text-[var(--rv-text-dim)] mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Main ── */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:py-16 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

        {/* Content */}
        <div className="lg:col-span-8 space-y-8">
          {/* Recent/Popular topics */}
          <RecentTopicsList />

          {/* Category grid */}
          {categories.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="rv-badge rv-badge-purple">◆ Categorias</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/forum/c/${c.slug}`}
                    className="rv-card group p-5 sm:p-6 flex flex-col gap-3 hover:scale-[1.01] transition-all duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-[var(--rv-surface-2)] border border-[var(--rv-border)] flex items-center justify-center text-lg sm:text-xl group-hover:scale-110 transition-transform flex-shrink-0">
                        {c.icon || "◈"}
                      </div>
                      <span className="rv-badge rv-badge-purple text-[8px] sm:text-[9px]">{c.topic_count} tópicos</span>
                    </div>
                    <div>
                      <h3 className="rv-display text-base sm:text-lg text-white group-hover:text-[var(--rv-accent)] transition-colors">{c.name}</h3>
                      <p className="mt-1 text-xs text-[var(--rv-text-muted)] line-clamp-2" style={{ fontFamily: "var(--font-body)" }}>
                        {c.description}
                      </p>
                    </div>
                    <div className="rv-divider" />
                    <div className="flex items-center justify-between rv-label text-[8px] sm:text-[9px] text-[var(--rv-text-dim)]">
                      <span>{c.reply_count} respostas</span>
                      <span className="text-[var(--rv-accent)] group-hover:translate-x-1 transition-transform inline-block">→</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {!categoriesRes.ok && (
            <div className="rv-card p-8 text-center text-[var(--rv-text-muted)]" style={{ fontFamily: "var(--font-body)" }}>
              Não foi possível carregar as categorias.
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="rv-card p-5 sm:p-6">
            <h3 className="rv-display text-base sm:text-lg text-white mb-5 flex items-center gap-2">
              <span className="text-[var(--rv-gold)]">◆</span> Regras da Arena
            </h3>
            <ul className="space-y-3">
              {[
                "Respeite todos os heróis.",
                "Sem spoilers fora da categoria certa.",
                "Mantenha o foco no tema do tópico.",
                "Reportar bugs com logs e prints.",
              ].map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-[var(--rv-text-muted)]" style={{ fontFamily: "var(--font-body)" }}>
                  <span className="text-[var(--rv-accent)] mt-0.5 flex-shrink-0 font-bold">{i + 1}.</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>

          <div className="rv-card p-5 sm:p-6 border-[var(--rv-accent)]/30"
            style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.08), rgba(6,182,212,0.05))" }}>
            <h3 className="rv-display text-base sm:text-lg text-white mb-2">Novo em Ravenna?</h3>
            <p className="text-xs sm:text-sm text-[var(--rv-text-muted)] mb-4" style={{ fontFamily: "var(--font-body)" }}>
              Crie sua conta e entre no maior fórum de jogadores.
            </p>
            <Link href="/register" className="rv-btn rv-btn-primary w-full h-11 text-xs">
              Criar Conta Grátis
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
