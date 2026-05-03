import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { SkillBar } from "./SkillBar";
import type { PlayerSkill } from "@/types";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function makeSkill(overrides: Partial<PlayerSkill> = {}): PlayerSkill {
  return {
    id: "skill-0001",
    skill_template: "tmpl-0001",
    skill_name: "Fireball",
    current_level: 1,
    is_equipped: true,
    slot_index: 0,
    learned_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("SkillBar", () => {
  it("renderiza 8 slots de habilidade", () => {
    render(<SkillBar skills={[]} gold={1000} onSkillChange={vi.fn()} />);
    // 8 slot containers with slot numbers 1-8
    for (let i = 1; i <= 8; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument();
    }
  });

  it("skill equipada aparece no slot correto", () => {
    const skill = makeSkill({ skill_name: "Fireball", slot_index: 2, is_equipped: true });
    render(<SkillBar skills={[skill]} gold={1000} onSkillChange={vi.fn()} />);
    // slot_index=2 renders as "3" in both the slot grid and the skill list row
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/Fire/).length).toBeGreaterThan(0);
  });

  it("exibe nível da skill como pips preenchidos", () => {
    const skill = makeSkill({ current_level: 2 });
    render(<SkillBar skills={[skill]} gold={500} onSkillChange={vi.fn()} />);
    expect(screen.getByText("Nível 2/5")).toBeInTheDocument();
  });

  it("botão de upgrade exibe custo em ouro", () => {
    const skill = makeSkill({ current_level: 1 });
    render(<SkillBar skills={[skill]} gold={500} onSkillChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /100g/i })).toBeInTheDocument();
  });

  it("botão de upgrade desabilitado quando ouro insuficiente", () => {
    const skill = makeSkill({ current_level: 1 });
    render(<SkillBar skills={[skill]} gold={50} onSkillChange={vi.fn()} />);
    const btn = screen.getByRole("button", { name: /100g/i });
    expect(btn).toBeDisabled();
  });

  it("skill no nível máximo exibe badge MAX", () => {
    const skill = makeSkill({ current_level: 5 });
    render(<SkillBar skills={[skill]} gold={9999} onSkillChange={vi.fn()} />);
    expect(screen.getByText("MAX")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /500g/i })).not.toBeInTheDocument();
  });

  it("upgrade chama POST com id correto e invoca onSkillChange", async () => {
    const user = userEvent.setup();
    const onSkillChange = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json({ id: "skill-0001", current_level: 2, skill_name: "Fireball" })
      )
    );

    const skill = makeSkill({ id: "skill-0001", current_level: 1 });
    render(<SkillBar skills={[skill]} gold={1000} onSkillChange={onSkillChange} />);

    await user.click(screen.getByRole("button", { name: /100g/i }));
    await waitFor(() => expect(onSkillChange).toHaveBeenCalledTimes(1));
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "/api/game/skills/skill-0001/upgrade",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("erro no upgrade exibe mensagem de erro", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ error: "Ouro insuficiente." }, 400))
    );

    const skill = makeSkill({ id: "skill-err", current_level: 1 });
    render(<SkillBar skills={[skill]} gold={1000} onSkillChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /100g/i }));
    await waitFor(() =>
      expect(screen.getByText("Ouro insuficiente.")).toBeInTheDocument()
    );
  });

  it("sem habilidades exibe mensagem vazia", () => {
    render(<SkillBar skills={[]} gold={0} onSkillChange={vi.fn()} />);
    expect(screen.getByText(/Nenhuma habilidade aprendida/i)).toBeInTheDocument();
  });

  it("skill não equipada aparece na lista sem número de slot", () => {
    const skill = makeSkill({ is_equipped: false, slot_index: null, skill_name: "Ice Lance" });
    render(<SkillBar skills={[skill]} gold={500} onSkillChange={vi.fn()} />);
    expect(screen.getByText("Ice Lance")).toBeInTheDocument();
    // Shows note about unequipped skills
    expect(screen.getByText(/1 habilidade/i)).toBeInTheDocument();
  });

  it("custo de upgrade escala com nível atual", () => {
    const skill = makeSkill({ current_level: 3 });
    render(<SkillBar skills={[skill]} gold={9999} onSkillChange={vi.fn()} />);
    // cost = 3 * 100 = 300
    expect(screen.getByRole("button", { name: /300g/i })).toBeInTheDocument();
  });
});
