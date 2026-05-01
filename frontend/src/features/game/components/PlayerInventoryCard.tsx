"use client";

import { PlayerInventory } from "@/types";

type Props = { inventory: PlayerInventory };

const RARITY_COLORS: Record<string, string> = {
  common:    "var(--rv-text-dim)",
  uncommon:  "var(--rv-cyan)",
  rare:      "var(--rv-accent)",
  epic:      "#a855f7",
  legendary: "var(--rv-gold)",
};

export function PlayerInventoryCard({ inventory }: Props) {
  const totalSlots = Math.max(inventory.max_slots, 20);
  const slots = Array.from({ length: totalSlots }).map((_, i) =>
    inventory.items.find((item) => item.slot_index === i)
  );
  const capacityPct = Math.min((inventory.slots_used / inventory.max_slots) * 100, 100);

  return (
    <div className="rv-card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="rv-badge rv-badge-gold mb-2 inline-flex">🎒 Inventário</span>
          <h3 className="rv-display text-xl text-white">Itens</h3>
        </div>
        <div className="rv-card px-4 py-2 border-[var(--rv-gold)]/30 text-center"
          style={{ background: "rgba(234,179,8,0.07)" }}>
          <div className="rv-display text-lg text-[var(--rv-gold)]">{inventory.gold.toLocaleString()}</div>
          <div className="rv-label text-[8px] text-[var(--rv-text-dim)]">Ouro</div>
        </div>
      </div>

      {/* Capacity bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="rv-label text-[9px] text-[var(--rv-text-dim)]">Capacidade</span>
          <span className="rv-label text-[9px] text-[var(--rv-text-muted)]">{inventory.slots_used}/{inventory.max_slots}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-[var(--rv-surface-2)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${capacityPct}%`,
              background: capacityPct > 90
                ? "var(--rv-red)"
                : capacityPct > 70
                ? "var(--rv-gold)"
                : "linear-gradient(90deg, var(--rv-accent), var(--rv-cyan))"
            }}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        {slots.map((item, i) => (
          <div
            key={i}
            title={item ? `${item.name}${item.quantity > 1 ? ` (x${item.quantity})` : ""}` : "Slot vazio"}
            className={`group relative aspect-square rounded-xl border transition-all duration-200 ${
              item
                ? "border-[var(--rv-border-hover)] bg-[var(--rv-surface-2)] hover:scale-105"
                : "border-[var(--rv-border)] bg-[var(--rv-surface)]/50 hover:bg-[var(--rv-surface-2)]"
            }`}
            style={item ? { boxShadow: `0 0 12px rgba(139,92,246,0.1)` } : {}}
          >
            {item ? (
              <div className="flex h-full w-full flex-col items-center justify-center p-1.5 gap-1">
                <div
                  className="h-7 w-7 rounded-lg"
                  style={{
                    background: `linear-gradient(135deg, ${RARITY_COLORS[item.name?.toLowerCase()] ?? "var(--rv-accent)"}, var(--rv-cyan))`,
                    opacity: 0.85,
                  }}
                />
                <span className="text-[8px] font-bold text-[var(--rv-text-muted)] truncate w-full text-center leading-none">
                  {item.name.slice(0, 8)}
                </span>
                {item.quantity > 1 && (
                  <span className="absolute bottom-0.5 right-1 text-[8px] font-black text-[var(--rv-gold)]">
                    ×{item.quantity}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <div className="h-3 w-3 rounded-full border border-[var(--rv-border)] opacity-30" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
