"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import type { ItemTemplate, ItemRarity, PaginatedResponse } from "@/types";

// ── Constants ──────────────────────────────────────────────────────────────────

const RARITIES: { value: ItemRarity | ""; label: string; color: string }[] = [
  { value: "",          label: "Todas",    color: "var(--rv-text-muted)" },
  { value: "common",    label: "Comum",    color: "var(--rv-text-muted)" },
  { value: "uncommon",  label: "Incomum",  color: "#22c55e" },
  { value: "rare",      label: "Raro",     color: "var(--rv-accent)" },
  { value: "epic",      label: "Épico",    color: "#a855f7" },
  { value: "legendary", label: "Lendário", color: "var(--rv-gold)" },
];

const RARITY_COLORS: Record<string, string> = {
  common:    "var(--rv-text-muted)",
  uncommon:  "#22c55e",
  rare:      "var(--rv-accent)",
  epic:      "#a855f7",
  legendary: "var(--rv-gold)",
};

const RARITY_GLOWS: Record<string, string> = {
  common:    "none",
  uncommon:  "0 0 10px rgba(34,197,94,0.2)",
  rare:      "0 0 12px rgba(139,92,246,0.25)",
  epic:      "0 0 16px rgba(168,85,247,0.35)",
  legendary: "0 0 20px rgba(234,179,8,0.4)",
};

// ── Fetch hook ─────────────────────────────────────────────────────────────────

type Filters = {
  search: string;
  rarity: ItemRarity | "";
  item_type: string;
  ordering: string;
  page: number;
};

function useItems(filters: Filters) {
  return useQuery({
    queryKey: ["game-data", "items", filters],
    queryFn: async (): Promise<PaginatedResponse<ItemTemplate>> => {
      const params = new URLSearchParams();
      if (filters.search)    params.set("search",    filters.search);
      if (filters.rarity)    params.set("rarity",    filters.rarity);
      if (filters.item_type) params.set("item_type", filters.item_type);
      if (filters.ordering)  params.set("ordering",  filters.ordering);
      params.set("page", String(filters.page));
      const res = await api.get(`/game-data/items/?${params.toString()}`);
      return res.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatBadge({ label, value }: { label: string; value: number }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-[var(--rv-text-dim)]">{label}</span>
      <span className="font-mono font-bold text-[var(--rv-text-muted)]">+{value}</span>
    </div>
  );
}

function ItemCard({ item }: { item: ItemTemplate }) {
  const color = RARITY_COLORS[item.rarity] ?? "var(--rv-text-muted)";
  const glow  = RARITY_GLOWS[item.rarity]  ?? "none";

  return (
    <div
      className="rv-card p-4 flex flex-col gap-3 transition-all duration-200 hover:scale-[1.02] hover:border-[var(--rv-border-hover)] cursor-default"
      style={{ boxShadow: glow }}
    >
      {/* Icon placeholder + rarity badge */}
      <div className="flex items-start justify-between gap-2">
        <div
          className="h-12 w-12 rounded-xl flex-shrink-0 flex items-center justify-center text-xl"
          style={{ background: `linear-gradient(135deg, ${color}22, ${color}44)`, border: `1px solid ${color}44` }}
        >
          {item.item_type === "weapon"    ? "⚔"  :
           item.item_type === "armor"     ? "🛡"  :
           item.item_type === "helmet"    ? "⛑"  :
           item.item_type === "consumable"? "🧪"  :
           item.item_type === "accessory" ? "💍"  :
           item.item_type === "material"  ? "🪨"  : "📦"}
        </div>
        <span
          className="rv-label text-[8px] px-2 py-0.5 rounded-full border"
          style={{ color, borderColor: `${color}55`, background: `${color}11` }}
        >
          {item.rarity.toUpperCase()}
        </span>
      </div>

      {/* Name + type */}
      <div>
        <h3 className="rv-display text-sm text-white leading-tight">{item.name}</h3>
        <p className="text-[10px] text-[var(--rv-text-dim)] mt-0.5 capitalize">{item.item_type.replace(/_/g, " ")}</p>
      </div>

      {/* Stats */}
      <div className="space-y-1 flex-1">
        <StatBadge label="Dano"    value={item.base_damage}  />
        <StatBadge label="Defesa"  value={item.base_defense} />
        <StatBadge label="HP"      value={item.base_health}  />
        <StatBadge label="Mana"    value={item.base_mana}    />
      </div>

      {/* Footer: level + price */}
      <div className="flex items-center justify-between border-t border-[var(--rv-border)] pt-2 mt-auto">
        <span className="text-[10px] text-[var(--rv-text-dim)]">Lv. {item.level_required}</span>
        <span className="rv-label text-[10px] text-[var(--rv-gold)] font-bold">
          {item.price.toLocaleString()} 💰
        </span>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rv-card p-4 space-y-3 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="h-12 w-12 rounded-xl bg-[var(--rv-surface-2)]" />
        <div className="h-4 w-16 rounded-full bg-[var(--rv-surface-2)]" />
      </div>
      <div className="space-y-1.5">
        <div className="h-3 w-3/4 rounded bg-[var(--rv-surface-2)]" />
        <div className="h-2.5 w-1/2 rounded bg-[var(--rv-surface-2)]" />
      </div>
      <div className="space-y-1">
        {[1, 2].map((i) => <div key={i} className="h-2.5 rounded bg-[var(--rv-surface-2)]" />)}
      </div>
      <div className="flex justify-between border-t border-[var(--rv-border)] pt-2">
        <div className="h-2.5 w-10 rounded bg-[var(--rv-surface-2)]" />
        <div className="h-2.5 w-14 rounded bg-[var(--rv-surface-2)]" />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function GameDataItemsPage() {
  const [filters, setFilters] = useState<Filters>({
    search: "",
    rarity: "",
    item_type: "",
    ordering: "name",
    page: 1,
  });

  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading, isFetching } = useItems(filters);

  const setFilter = useCallback(<K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  }, []);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setFilter("search", searchInput.trim());
  }, [searchInput, setFilter]);

  const totalPages = data ? Math.ceil(data.count / 20) : 0;

  return (
    <div className="relative min-h-screen">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="rv-orb" style={{ width: 400, height: 400, top: "-10%", right: "-5%", background: "var(--rv-accent)", opacity: 0.06 }} />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <span className="rv-badge rv-badge-purple mb-3 inline-flex">⚔ Game Data</span>
          <h1 className="rv-display text-4xl text-white">Banco de Itens</h1>
          <p className="mt-2 text-sm text-[var(--rv-text-muted)]" style={{ fontFamily: "var(--font-body)" }}>
            Templates públicos de todos os itens do servidor.
            {data && <span className="ml-2 text-[var(--rv-text-dim)]">({data.count} itens)</span>}
          </p>
        </div>

        {/* Filters */}
        <div className="rv-card p-4 mb-6 flex flex-col sm:flex-row gap-3 flex-wrap">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por nome..."
              className="flex-1 bg-[var(--rv-surface)] border border-[var(--rv-border)] rounded-xl px-3 py-2 text-sm text-[var(--rv-text-primary)] placeholder-[var(--rv-text-dim)] focus:outline-none focus:border-[var(--rv-accent)] transition-colors"
            />
            <button
              type="submit"
              className="rv-btn rv-btn-primary px-4 py-2 text-sm"
            >
              Buscar
            </button>
          </form>

          {/* Rarity filter */}
          <div className="flex gap-1.5 flex-wrap">
            {RARITIES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setFilter("rarity", r.value)}
                className="rv-label text-[9px] px-3 py-1.5 rounded-full border transition-all"
                style={
                  filters.rarity === r.value
                    ? { color: r.color, borderColor: r.color, background: `${r.color}18` }
                    : { color: "var(--rv-text-dim)", borderColor: "var(--rv-border)" }
                }
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Ordering */}
          <select
            value={filters.ordering}
            onChange={(e) => setFilter("ordering", e.target.value)}
            className="bg-[var(--rv-surface)] border border-[var(--rv-border)] rounded-xl px-3 py-2 text-sm text-[var(--rv-text-muted)] focus:outline-none focus:border-[var(--rv-accent)] transition-colors"
          >
            <option value="name">Nome A-Z</option>
            <option value="-name">Nome Z-A</option>
            <option value="level_required">Nível ↑</option>
            <option value="-level_required">Nível ↓</option>
            <option value="price">Preço ↑</option>
            <option value="-price">Preço ↓</option>
          </select>
        </div>

        {/* Active filter chips */}
        {(filters.search || filters.rarity) && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {filters.search && (
              <span className="rv-badge rv-badge-purple text-[10px] flex items-center gap-1">
                Busca: "{filters.search}"
                <button onClick={() => { setSearchInput(""); setFilter("search", ""); }} className="ml-1 hover:text-white">×</button>
              </span>
            )}
            {filters.rarity && (
              <span className="rv-badge text-[10px] flex items-center gap-1" style={{ color: RARITY_COLORS[filters.rarity] }}>
                {RARITIES.find((r) => r.value === filters.rarity)?.label}
                <button onClick={() => setFilter("rarity", "")} className="ml-1 hover:text-white">×</button>
              </span>
            )}
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 18 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : !data?.results?.length ? (
          <div className="rv-card p-16 text-center">
            <div className="text-5xl mb-4">🗡️</div>
            <h3 className="rv-display text-2xl text-white mb-2">Nenhum item encontrado</h3>
            <p className="text-sm text-[var(--rv-text-muted)]" style={{ fontFamily: "var(--font-body)" }}>
              Tente outros filtros ou aguarde dados serem cadastrados.
            </p>
          </div>
        ) : (
          <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 transition-opacity ${isFetching ? "opacity-60" : "opacity-100"}`}>
            {data.results.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setFilters((p) => ({ ...p, page: p.page - 1 }))}
              disabled={filters.page <= 1}
              className="rv-btn px-4 py-2 text-sm disabled:opacity-30"
            >
              ← Anterior
            </button>
            <span className="rv-label text-[10px] text-[var(--rv-text-dim)] px-4">
              {filters.page} / {totalPages}
            </span>
            <button
              onClick={() => setFilters((p) => ({ ...p, page: p.page + 1 }))}
              disabled={filters.page >= totalPages}
              className="rv-btn px-4 py-2 text-sm disabled:opacity-30"
            >
              Próxima →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
