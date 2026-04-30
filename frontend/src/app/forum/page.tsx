import Link from "next/link";
import type { Metadata } from "next";
import { Users, LayoutGrid, MessageCircle } from "lucide-react";
import { backendFetch } from "@/lib/backend";
import { ForumHeaderActions } from "@/app/forum/forum-header-actions";
import { RecentTopicsList } from "./recent-topics-list";

type Paginated<T> = {
  count: number;
  results: T[];
};

type ForumCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string | null;
  topic_count: number;
  reply_count: number;
};

export const metadata: Metadata = {
  title: "Comunidade | Projeto Ravenna",
  description: "Participe da comunidade Ravenna, discuta estratégias e conheça outros jogadores.",
  alternates: { canonical: "/forum" },
};

export default async function ForumPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="relative h-[40vh] flex items-center justify-center overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 to-black pointer-events-none" />
        <div className="relative z-10 text-center space-y-4 px-4">
          <span className="text-xs font-black uppercase tracking-[0.4em] text-purple-500">Ravenna Community</span>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter">O Fórum Oficial</h1>
          <p className="text-gray-400 max-w-lg mx-auto text-sm md:text-base">
            Onde lendas se encontram para discutir o futuro de Ravenna.
          </p>
          <div className="pt-6 flex justify-center gap-4">
             <ForumHeaderActions newTopicHref="/forum/new" />
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 py-16 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-16">
          <RecentTopicsList />
          
          <div className="space-y-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 text-blue-500" />
              Categorias
            </h2>
            <ForumCategoryList />
          </div>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4 space-y-8">
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              Estatísticas
            </h3>
            <div className="space-y-4">
               <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-sm text-gray-500">Jogadores Ativos</span>
                  <span className="text-sm font-bold">1,248</span>
               </div>
               <div className="flex justify-between items-center py-2 border-b border-white/5">
                  <span className="text-sm text-gray-500">Total de Tópicos</span>
                  <span className="text-sm font-bold">452</span>
               </div>
               <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-gray-500">Novas Mensagens Hoje</span>
                  <span className="text-sm font-bold text-green-400">+82</span>
               </div>
            </div>
          </div>

          <div className="rounded-3xl border border-purple-500/20 bg-purple-500/5 p-8 relative overflow-hidden">
             <MessageCircle className="absolute -bottom-4 -right-4 h-24 w-24 text-purple-500/10 -rotate-12" />
             <h3 className="font-bold text-lg mb-2 relative z-10">Precisa de Ajuda?</h3>
             <p className="text-sm text-purple-200/70 mb-6 relative z-10">
               Nossa equipe de moderadores está sempre pronta para auxiliar na área de Suporte.
             </p>
             <Link href="/forum/c/suporte" className="relative z-10 text-sm font-bold text-white hover:underline">
               Ver área de suporte →
             </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

async function ForumCategoryList() {
  const res = await backendFetch<Paginated<ForumCategory>>("/api/v1/forum/public/categories/?page=1&page_size=50", {
    method: "GET",
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    return (
      <div className="p-8 rounded-3xl border border-white/10 bg-white/[0.02] text-sm text-gray-500">
        Não foi possível carregar as categorias.
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {res.data.results.map((c) => (
        <Link
          key={c.id}
          href={`/forum/c/${c.slug}`}
          className="group relative flex flex-col p-8 rounded-3xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-purple-500/30 transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
               {/* Icon placeholder - could map from c.icon */}
               <MessageCircle className="h-5 w-5" />
            </div>
            <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest">
               {c.topic_count} tópicos
            </div>
          </div>
          <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">{c.name}</h3>
          <p className="mt-2 text-sm text-gray-500 line-clamp-2">{c.description}</p>
        </Link>
      ))}
    </div>
  );
}
