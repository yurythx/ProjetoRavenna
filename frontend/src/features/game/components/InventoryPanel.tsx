"use client";

import React, { useState, useTransition } from "react";
import type { PlayerInventory, PlayerItem, ItemRarity } from "@/types";

const RARITY_COLOR: Record<ItemRarity, string> = {
  common:    "var(--rv-text-dim)",
  uncommon:  "var(--rv-cyan)",
  rare:      "var(--rv-accent)",
  epic:      "#a855f7",
  legendary: "var(--rv-gold)",
};

const RARITY_LABEL: Record<ItemRarity, string> = {
  common:    "Comum",
  uncommon:  "Incomum",
  rare:      "Raro",
  epic:      "Épico",
  legendary: "Lendário",
};

const SLOT_LABEL: Record<string, string> = {
  weapon:  "Arma",
  offhand: "Mão Sec.",
  helmet:  "Capacete",
  chest:   "Peitoral",
  gloves:  "Luvas",
  boots:   "Botas",
  ring_1:  "Anel 1",
  ring_2:  "Anel 2",
  amulet:  "Amuleto",
};

const TYPE_TO_SLOTS: Record<string, string[]> = {
  weapon:  ["weapon", "offhand"],
  offhand: ["offhand"],
  helmet:  ["helmet"],
  chest:   ["chest"],
  gloves:  ["gloves"],
  boots:   ["boots"],
  ring:    ["ring_1", "ring_2"],
  amulet:  ["amulet"],
};

function getValidSlots(item_type: string): string[] {
  return TYPE_TO_SLOTS[item_type] ?? [];
}

type Props = {
  inventory: PlayerInventory;
  onInventoryChange: () => void;
};

export function InventoryPanel({ inventory, onInventoryChange }: Props) {
  const [selected, setSelected] = useState<PlayerItem | null>(null);
  const [targetSlot, setTargetSlot] = useState("");
  const [error, setError]     = useState("");
  const [isPending, startTransition] = useTransition();

  const totalSlots = Math.max(inventory.max_slots, 20);
  const slots = Array.from({ length: totalSlots }).map((_, i) =>
    inventory.items.find((it) => it.slot_index === i)
  );
  const capacityPct = Math.min((inventory.slots_used / inventory.max_slots) * 100, 100);
  const validSlots  = selected ? getValidSlots(selected.item_type) : [];

  function selectItem(item: PlayerItem | undefined) {
    setSelected(item ?? null);
    setTargetSlot("");
    setError("");
  }

  function equip() {
    if (!selected || !targetSlot) return;
    setError("");
    startTransition(async () => {
      const res = await fetch("/api/game/inventory/equip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_item_id: selected.id, equip_slot: targetSlot }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data?.error ?? "Erro ao equipar item.");
      } else {
        setSelected(null);
        setTargetSlot("");
        onInventoryChange();
      }
    });
  }

  function unequip() {
    if (!selected?.equip_slot) return;
    setError("");
    startTransition(async () => {
      const res = await fetch("/api/game/inventory/unequip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ equip_slot: selected.equip_slot }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data?.error ?? "Erro ao desequipar item.");
      } else {
        setSelected(null);
        onInventoryChange();
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="rv-badge rv-badge-gold mb-2 inline-flex">🎒 Inventário</span>
        </div>
        <div
          className="rv-card px-4 py-2 text-center"
          style={{ background: "rgba(234,179,8,0.07)", borderColor: "rgba(234,179,8,0.25)" }}
        >
          <div className="rv-display text-lg text-[var(--rv-gold)]">{inventory.gold.toLocaleString("pt-BR")}</div>
          <div className="rv-label text-[8px] text-[var(--rv-text-dim)]">Ouro</div>
        </div>
      </div>

      {/* Capacity bar */}
      <div>
        <div className="flex justify-between mb-1.5">
          <span className="rv-label text-[9px] text-[var(--rv-text-dim)]">Capacidade</span>
          <span className="rv-label text-[9px] text-[var(--rv-text-muted)]">{inventory.slots_used}/{inventory.max_slots}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-[var(--rv-surface-2)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${capacityPct}%`,
              background:
                capacityPct > 90 ? "var(--rv-red)"
                : capacityPct > 70 ? "var(--rv-gold)"
                : "linear-gradient(90deg, var(--rv-accent), var(--rv-cyan))",
            }}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
        {slots.map((item, i) => {
          const isSelected = selected?.slot_index === i && !!item;
          const color = item ? RARITY_COLOR[item.rarity] : undefined;
          return (
            <button
              key={i}
              type="button"
              title={item ? `${item.name}${item.quantity > 1 ? ` ×${item.quantity}` : ""}` : "Slot vazio"}
              onClick={() => selectItem(isSelected ? undefined : item)}
              className={`relative aspect-square rounded-xl border transition-all duration-150 ${
                item ? "hover:scale-105" : "hover:bg-[var(--rv-surface-2)] cursor-default"
              }`}
              style={{
                background:  isSelected ? `${color}22` : item ? "var(--rv-surface-2)" : "var(--rv-surface)",
                borderColor: isSelected ? color : item ? "var(--rv-border-hover)" : "var(--rv-border)",
                boxShadow:   isSelected ? `0 0 10px ${color}55` : "none",
              }}
            >
              {item ? (
                <div className="flex h-full w-full flex-col items-center justify-center p-1 gap-0.5">
                  <div
                    className="h-5 w-5 rounded-md"
                    style={{ background: `linear-gradient(135deg, ${color}, var(--rv-surface))` }}
                  />
                  <span className="text-[7px] font-semibold text-[var(--rv-text-muted)] truncate w-full text-center leading-none">
                    {item.name.slice(0, 7)}
                  </span>
                  {item.equip_slot && (
                    <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-[var(--rv-gold)]" title="Equipado" />
                  )}
                  {item.quantity > 1 && (
                    <span className="absolute bottom-0.5 right-1 text-[7px] font-black text-[var(--rv-gold)]">×{item.quantity}</span>
                  )}
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <div className="h-2 w-2 rounded-full border border-[var(--rv-border)] opacity-25" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Item detail */}
      {selected && (
        <div
          className="rounded-2xl border p-4 space-y-4 transition-all"
          style={{ borderColor: `${RARITY_COLOR[selected.rarity]}44`, background: `${RARITY_COLOR[selected.rarity]}0a` }}
        >
          <div className="flex items-start gap-3">
            <div
              className="h-12 w-12 rounded-xl flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${RARITY_COLOR[selected.rarity]}, var(--rv-surface-2))` }}
            />
            <div className="flex-1 min-w-0">
              <h4 className="rv-display text-base text-white truncate">{selected.name}</h4>
              <div className="flex flex-wrap gap-1.5 mt-1">
                <span
                  className="rv-label text-[8px] px-2 py-0.5 rounded-full border"
                  style={{ color: RARITY_COLOR[selected.rarity], borderColor: `${RARITY_COLOR[selected.rarity]}44`, background: `${RARITY_COLOR[selected.rarity]}12` }}
                >
                  {RARITY_LABEL[selected.rarity]}
                </span>
                <span className="rv-label text-[8px] px-2 py-0.5 rounded-full bg-[var(--rv-surface-2)] border border-[var(--rv-border)] text-[var(--rv-text-dim)]">
                  {selected.item_type}
                </span>
                {selected.quantity > 1 && (
                  <span className="rv-label text-[8px] px-2 py-0.5 rounded-full bg-[var(--rv-surface-2)] border border-[var(--rv-border)] text-[var(--rv-gold)]">
                    ×{selected.quantity}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-[var(--rv-text-dim)] hover:text-white transition-colors text-lg leading-none"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="rv-badge rv-badge-red text-center w-full py-1.5 block text-xs">{error}</div>
          )}

          {/* Already equipped → unequip */}
          {selected.equip_slot ? (
            <div className="flex items-center gap-3">
              <span className="rv-label text-[9px] text-[var(--rv-text-dim)]">
                Equipado em: <span className="text-[var(--rv-gold)]">{SLOT_LABEL[selected.equip_slot] ?? selected.equip_slot}</span>
              </span>
              <button
                type="button"
                disabled={isPending}
                onClick={unequip}
                className="rv-btn rv-btn-secondary h-8 px-4 text-xs ml-auto disabled:opacity-50"
              >
                {isPending ? "..." : "Desequipar"}
              </button>
            </div>
          ) : validSlots.length > 0 ? (
            /* Equippable → show slot picker */
            <div className="space-y-3">
              <span className="rv-label text-[9px] text-[var(--rv-text-dim)] block">Escolha o slot:</span>
              <div className="flex flex-wrap gap-2">
                {validSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setTargetSlot(slot)}
                    className="rv-label text-[9px] px-3 py-1.5 rounded-full border transition-all"
                    style={{
                      background:  targetSlot === slot ? "var(--rv-accent)" : "var(--rv-surface-2)",
                      borderColor: targetSlot === slot ? "var(--rv-accent)" : "var(--rv-border)",
                      color:       targetSlot === slot ? "white" : "var(--rv-text-muted)",
                    }}
                  >
                    {SLOT_LABEL[slot] ?? slot}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={!targetSlot || isPending}
                onClick={equip}
                className="rv-btn rv-btn-primary h-8 px-6 text-xs disabled:opacity-40"
              >
                {isPending ? "..." : "⚔ Equipar"}
              </button>
            </div>
          ) : (
            <p className="rv-label text-[9px] text-[var(--rv-text-dim)]">Este item não pode ser equipado.</p>
          )}
        </div>
      )}
    </div>
  );
}
