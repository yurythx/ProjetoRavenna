"use client";

import { useState, useTransition } from "react";
import type { PlayerSkill } from "@/types";

const MAX_SKILL_LEVEL = 5;
const BAR_SLOTS = 8;

const SLOT_KEYS = Array.from({ length: BAR_SLOTS }, (_, i) => i);

function upgradeCost(currentLevel: number) {
  return currentLevel * 100;
}

type Props = {
  skills: PlayerSkill[];
  gold: number;
  onSkillChange: () => void;
};

export function SkillBar({ skills, gold, onSkillChange }: Props) {
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  const equippedMap: Record<number, PlayerSkill> = {};
  const unequipped: PlayerSkill[] = [];

  for (const sk of skills) {
    if (sk.is_equipped && sk.slot_index !== null) {
      equippedMap[sk.slot_index] = sk;
    } else if (!sk.is_equipped) {
      unequipped.push(sk);
    }
  }

  function upgrade(skill: PlayerSkill) {
    if (skill.current_level >= MAX_SKILL_LEVEL) return;
    setErrors((prev) => ({ ...prev, [skill.id]: "" }));
    setUpgrading(skill.id);
    startTransition(async () => {
      const res = await fetch(`/api/game/skills/${skill.id}/upgrade`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setErrors((prev) => ({ ...prev, [skill.id]: data?.error ?? "Erro ao evoluir." }));
      } else {
        onSkillChange();
      }
      setUpgrading(null);
    });
  }

  return (
    <div className="space-y-6">
      <span className="rv-badge rv-badge-purple inline-flex">⚡ Habilidades Equipadas</span>

      {/* 8-slot bar */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {SLOT_KEYS.map((idx) => {
          const sk = equippedMap[idx];
          return (
            <div key={idx} className="flex flex-col items-center gap-1">
              <div
                className={`relative w-full aspect-square rounded-2xl border flex flex-col items-center justify-center p-1.5 gap-1 ${
                  sk ? "bg-[var(--rv-surface-2)] border-[var(--rv-border-hover)]" : "bg-[var(--rv-surface)] border-[var(--rv-border)] opacity-40"
                }`}
                style={sk ? { boxShadow: "0 0 14px rgba(139,92,246,0.12)" } : {}}
              >
                <span className="absolute top-1 left-1.5 rv-label text-[7px] text-[var(--rv-text-dim)]">{idx + 1}</span>
                {sk ? (
                  <>
                    <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-[var(--rv-accent)] to-[var(--rv-cyan)] opacity-80" />
                    <span className="text-[7px] font-semibold text-[var(--rv-text-muted)] truncate w-full text-center leading-none px-0.5">
                      {sk.skill_name.split(" ")[0]}
                    </span>
                    <span
                      className="rv-label text-[7px] px-1 py-0.5 rounded-full bg-[var(--rv-accent)]/15 border border-[var(--rv-accent)]/25 text-[var(--rv-accent)]"
                    >
                      Lv{sk.current_level}
                    </span>
                  </>
                ) : (
                  <div className="h-4 w-4 rounded-full border border-[var(--rv-border)] opacity-30" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Skill details list */}
      <div className="space-y-2">
        {skills.length === 0 && (
          <p className="text-[var(--rv-text-dim)] text-sm text-center py-6" style={{ fontFamily: "var(--font-body)" }}>
            Nenhuma habilidade aprendida ainda.
          </p>
        )}
        {skills.map((sk) => {
          const cost = upgradeCost(sk.current_level);
          const maxed = sk.current_level >= MAX_SKILL_LEVEL;
          const canAfford = gold >= cost;
          const isUpgrading = upgrading === sk.id && isPending;
          const errMsg = errors[sk.id];

          return (
            <div
              key={sk.id}
              className="flex items-center gap-3 rounded-xl bg-[var(--rv-surface-2)] border border-[var(--rv-border)] px-4 py-3"
            >
              {/* Slot indicator */}
              {sk.is_equipped && sk.slot_index !== null ? (
                <span
                  className="rv-label text-[8px] h-6 w-6 rounded-full flex-shrink-0 flex items-center justify-center border"
                  style={{ background: "var(--rv-accent)/15", borderColor: "var(--rv-accent)/30", color: "var(--rv-accent)" }}
                >
                  {(sk.slot_index ?? 0) + 1}
                </span>
              ) : (
                <span className="h-6 w-6 rounded-full border border-[var(--rv-border)] opacity-30 flex-shrink-0" />
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-[var(--rv-text-primary)] block truncate" style={{ fontFamily: "var(--font-body)" }}>
                  {sk.skill_name}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  {/* Level pips */}
                  <div className="flex gap-0.5">
                    {Array.from({ length: MAX_SKILL_LEVEL }).map((_, i) => (
                      <div
                        key={i}
                        className="h-1.5 w-3 rounded-full"
                        style={{ background: i < sk.current_level ? "var(--rv-accent)" : "var(--rv-border)" }}
                      />
                    ))}
                  </div>
                  <span className="rv-label text-[8px] text-[var(--rv-text-dim)]">Nível {sk.current_level}/{MAX_SKILL_LEVEL}</span>
                </div>
              </div>

              {/* Upgrade zone */}
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {errMsg && <span className="rv-label text-[8px] text-red-400 max-w-[100px] text-right">{errMsg}</span>}
                {maxed ? (
                  <span className="rv-label text-[8px] px-2 py-0.5 rounded-full bg-[var(--rv-gold)]/10 border border-[var(--rv-gold)]/25 text-[var(--rv-gold)]">
                    MAX
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={!canAfford || isUpgrading}
                    onClick={() => upgrade(sk)}
                    title={!canAfford ? `Precisa de ${cost}g` : `Evoluir por ${cost}g`}
                    className="rv-btn rv-btn-primary h-7 px-3 text-[9px] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isUpgrading ? "..." : `↑ ${cost}g`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {unequipped.length > 0 && (
        <p className="rv-label text-[9px] text-[var(--rv-text-dim)] text-center">
          {unequipped.length} habilidade(s) aprendida(s) mas não equipada(s). Equipe-as no jogo.
        </p>
      )}
    </div>
  );
}
