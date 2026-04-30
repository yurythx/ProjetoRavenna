import Link from "next/link";
import { motion } from "framer-motion";
import { Shield, Users, Newspaper, Sword, Zap, Globe } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-500/30">
      {/* Cinematic Hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4">
        {/* Background Effects */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-purple-600/20 blur-[120px] animate-pulse" />
          <div className="absolute top-1/4 right-1/4 h-[300px] w-[300px] rounded-full bg-blue-600/10 blur-[100px]" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50" />
        </div>

        <div className="relative z-10 text-center max-w-4xl">
          <span className="inline-block rounded-full border border-purple-500/30 bg-purple-500/10 px-6 py-2 text-xs font-black uppercase tracking-[0.3em] text-purple-400 mb-8">
            The Journey Begins
          </span>
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.9] mb-8">
            PROJETO <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-white to-blue-400">RAVENNA</span>
          </h1>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-12">
            Explore um ecossistema completo integrado à Unity. Autenticação segura, fórum da comunidade, 
            inventário persistente e um mundo em constante evolução.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link 
              href="/register" 
              className="group relative flex h-16 items-center justify-center overflow-hidden rounded-2xl bg-white px-10 text-black transition-all hover:scale-105"
            >
              <span className="relative z-10 font-black uppercase tracking-widest">Criar Conta</span>
              <div className="absolute inset-0 z-0 bg-gradient-to-r from-purple-400 to-blue-400 opacity-0 group-hover:opacity-10 transition-opacity" />
            </Link>
            <Link 
              href="/blog" 
              className="group flex h-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-10 backdrop-blur-xl transition-all hover:bg-white/10"
            >
              <span className="font-black uppercase tracking-widest">Ver Novidades</span>
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
           <div className="h-10 w-6 rounded-full border-2 border-white/20 flex justify-center p-2">
              <div className="h-2 w-1 bg-white/40 rounded-full" />
           </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 py-32 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard 
            icon={<Sword className="h-6 w-6 text-red-400" />}
            title="Sistemas de Jogo"
            description="Lógica de inventário, atributos e ganho de XP totalmente sincronizada entre Web e Unity."
            href="/me"
          />
          <FeatureCard 
            icon={<Users className="h-6 w-6 text-green-400" />}
            title="Comunidade"
            description="Fórum robusto com categorias, tópicos fixados e reações em tempo real para os jogadores."
            href="/forum"
          />
          <FeatureCard 
            icon={<Newspaper className="h-6 w-6 text-blue-400" />}
            title="Portal de Notícias"
            description="Blog integrado para atualizações, patch notes e comunicados oficiais do projeto."
            href="/blog"
          />
          <FeatureCard 
            icon={<Shield className="h-6 w-6 text-purple-400" />}
            title="Segurança"
            description="Autenticação JWT, proteção anti-cheat e auditoria completa de ações administrativas."
            href="/register"
          />
          <FeatureCard 
            icon={<Zap className="h-6 w-6 text-yellow-400" />}
            title="Performance"
            description="Backend em Django otimizado com cache Redis para leaderboards e sessões de jogo."
            href="/api/v1/game-logic/leaderboard/"
          />
          <FeatureCard 
            icon={<Globe className="h-6 w-6 text-emerald-400" />}
            title="API Integrada"
            description="Documentação Swagger completa para integração imediata com qualquer plataforma."
            href="/api/schema/swagger-ui/"
          />
        </div>
      </section>

      {/* Footer Minimalist */}
      <footer className="border-t border-white/5 py-20 px-4 text-center">
        <div className="mx-auto max-w-xl">
           <h2 className="text-2xl font-bold mb-4">Ravenna Platform</h2>
           <p className="text-gray-500 text-sm mb-8">
             &copy; 2026 Projeto Ravenna. Todos os direitos reservados. 
             Desenvolvido para alta performance e escalabilidade.
           </p>
           <div className="flex justify-center gap-8 text-xs font-black uppercase tracking-widest text-gray-600">
              <Link href="/forum" className="hover:text-white transition-colors">Fórum</Link>
              <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
              <Link href="/api/schema/swagger-ui/" className="hover:text-white transition-colors">API Docs</Link>
           </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, href }: { icon: React.ReactNode, title: string, description: string, href: string }) {
  return (
    <Link 
      href={href}
      className="group p-10 rounded-[2.5rem] border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all"
    >
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.03] group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </Link>
  );
}
