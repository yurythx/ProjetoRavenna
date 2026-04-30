import Link from "next/link";
import { backendFetch } from "@/lib/backend";
import { MessageSquare, Eye, Clock } from "lucide-react";

type Topic = {
  id: string;
  title: string;
  slug: string;
  author_name: string;
  category_name: string;
  reply_count: number;
  view_count: number;
  last_reply_at: string;
  is_pinned: boolean;
};

export async function RecentTopicsList() {
  const res = await backendFetch<{ results: Topic[] }>("/api/v1/forum/public/topics/popular/?limit=5", {
    method: "GET",
    next: { revalidate: 60 },
  });

  if (!res.ok) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <Clock className="h-5 w-5 text-purple-500" />
        Tópicos em Destaque
      </h2>
      <div className="space-y-3">
        {res.data.results.map((topic) => (
          <Link
            key={topic.id}
            href={`/forum/t/${topic.slug}`}
            className="group flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                {topic.is_pinned && <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-bold uppercase">Fixado</span>}
                <span className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors">{topic.title}</span>
              </div>
              <span className="text-xs text-gray-500">por {topic.author_name} em <span className="text-gray-400">{topic.category_name}</span></span>
            </div>
            
            <div className="flex items-center gap-6 mt-3 md:mt-0">
              <div className="flex items-center gap-1.5 text-gray-500">
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{topic.reply_count}</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-500">
                <Eye className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{topic.view_count}</span>
              </div>
              <div className="hidden md:block w-24 text-right">
                <span className="text-[10px] text-gray-600 font-bold uppercase">Última Resp.</span>
                <p className="text-[10px] text-gray-400">{new Date(topic.last_reply_at).toLocaleDateString()}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
