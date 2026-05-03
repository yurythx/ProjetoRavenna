import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { InventoryPanel } from "./InventoryPanel";
import type { PlayerInventory } from "@/types";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const SWORD_ITEM = {
  id: "aaaaaaaa-0000-0000-0000-000000000001",
  slot_index: 0,
  template_id: "bbbbbbbb-0000-0000-0000-000000000001",
  name: "Iron Sword",
  quantity: 1,
  equip_slot: "",
  rarity: "common" as const,
  item_type: "weapon",
};

const EQUIPPED_SWORD = { ...SWORD_ITEM, equip_slot: "weapon" };

const MATERIAL_ITEM = {
  id: "aaaaaaaa-0000-0000-0000-000000000002",
  slot_index: 1,
  template_id: "bbbbbbbb-0000-0000-0000-000000000002",
  name: "Wolf Fang",
  quantity: 3,
  equip_slot: "",
  rarity: "common" as const,
  item_type: "material",
};

function makeInventory(items: PlayerInventory["items"] = []): PlayerInventory {
  return {
    id: "inv-0001",
    gold: 1500,
    slots_used: items.length,
    max_slots: 20,
    items,
    updated_at: "2025-01-01T00:00:00Z",
  };
}

describe("InventoryPanel", () => {
  it("exibe ouro do inventário", () => {
    render(<InventoryPanel inventory={makeInventory()} onInventoryChange={vi.fn()} />);
    expect(screen.getByText("1.500")).toBeInTheDocument();
  });

  it("exibe barra de capacidade com slots usados", () => {
    const inv = makeInventory([SWORD_ITEM]);
    render(<InventoryPanel inventory={inv} onInventoryChange={vi.fn()} />);
    expect(screen.getByText("1/20")).toBeInTheDocument();
  });

  it("renderiza 20 slots mínimos mesmo com inventário vazio", () => {
    render(<InventoryPanel inventory={makeInventory()} onInventoryChange={vi.fn()} />);
    const emptyDots = document.querySelectorAll(".rounded-full.border.opacity-25");
    expect(emptyDots.length).toBeGreaterThanOrEqual(20);
  });

  it("exibe item no slot correto com nome truncado", () => {
    render(
      <InventoryPanel inventory={makeInventory([SWORD_ITEM])} onInventoryChange={vi.fn()} />
    );
    expect(screen.getByTitle("Iron Sword")).toBeInTheDocument();
  });

  it("item com quantidade > 1 exibe contador", () => {
    render(
      <InventoryPanel inventory={makeInventory([MATERIAL_ITEM])} onInventoryChange={vi.fn()} />
    );
    expect(screen.getByText("×3")).toBeInTheDocument();
  });

  it("clicar em item exibe painel de detalhe com nome completo", async () => {
    const user = userEvent.setup();
    render(
      <InventoryPanel inventory={makeInventory([SWORD_ITEM])} onInventoryChange={vi.fn()} />
    );
    await user.click(screen.getByTitle("Iron Sword"));
    expect(screen.getByText("Iron Sword")).toBeInTheDocument();
    expect(screen.getByText("weapon")).toBeInTheDocument();
  });

  it("arma sem equip_slot exibe seletor de slots", async () => {
    const user = userEvent.setup();
    render(
      <InventoryPanel inventory={makeInventory([SWORD_ITEM])} onInventoryChange={vi.fn()} />
    );
    await user.click(screen.getByTitle("Iron Sword"));
    expect(screen.getByText("Arma")).toBeInTheDocument();
    expect(screen.getByText("Mão Sec.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Equipar/i })).toBeInTheDocument();
  });

  it("item já equipado exibe botão Desequipar", async () => {
    const user = userEvent.setup();
    render(
      <InventoryPanel inventory={makeInventory([EQUIPPED_SWORD])} onInventoryChange={vi.fn()} />
    );
    await user.click(screen.getByTitle("Iron Sword"));
    expect(screen.getByRole("button", { name: /Desequipar/i })).toBeInTheDocument();
    expect(screen.getByText(/Arma/)).toBeInTheDocument();
  });

  it("material não-equipável exibe mensagem de não-equipável", async () => {
    const user = userEvent.setup();
    render(
      <InventoryPanel inventory={makeInventory([MATERIAL_ITEM])} onInventoryChange={vi.fn()} />
    );
    await user.click(screen.getByTitle(/Wolf Fang/));
    expect(screen.getByText(/não pode ser equipado/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Equipar/i })).not.toBeInTheDocument();
  });

  it("fechar painel de detalhe ao clicar ✕", async () => {
    const user = userEvent.setup();
    render(
      <InventoryPanel inventory={makeInventory([SWORD_ITEM])} onInventoryChange={vi.fn()} />
    );
    await user.click(screen.getByTitle("Iron Sword"));
    expect(screen.getByText("Iron Sword")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "✕" }));
    expect(screen.queryByText("weapon")).not.toBeInTheDocument();
  });

  it("ação equip envia POST correto e chama onInventoryChange", async () => {
    const user = userEvent.setup();
    const onInventoryChange = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async () => json({ ok: true, equip_slot: "weapon" })));

    render(
      <InventoryPanel inventory={makeInventory([SWORD_ITEM])} onInventoryChange={onInventoryChange} />
    );
    await user.click(screen.getByTitle("Iron Sword"));
    await user.click(screen.getByRole("button", { name: "Arma" }));
    await user.click(screen.getByRole("button", { name: /Equipar/i }));

    await waitFor(() => expect(onInventoryChange).toHaveBeenCalledTimes(1));
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "/api/game/inventory/equip",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("ação unequip envia POST correto e chama onInventoryChange", async () => {
    const user = userEvent.setup();
    const onInventoryChange = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async () => json({ ok: true })));

    render(
      <InventoryPanel inventory={makeInventory([EQUIPPED_SWORD])} onInventoryChange={onInventoryChange} />
    );
    await user.click(screen.getByTitle("Iron Sword"));
    await user.click(screen.getByRole("button", { name: /Desequipar/i }));

    await waitFor(() => expect(onInventoryChange).toHaveBeenCalledTimes(1));
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "/api/game/inventory/unequip",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("erro no equip exibe mensagem de erro", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ error: "Classe inválida para este item." }, 400))
    );

    render(
      <InventoryPanel inventory={makeInventory([SWORD_ITEM])} onInventoryChange={vi.fn()} />
    );
    await user.click(screen.getByTitle("Iron Sword"));
    await user.click(screen.getByRole("button", { name: "Arma" }));
    await user.click(screen.getByRole("button", { name: /Equipar/i }));

    await waitFor(() =>
      expect(screen.getByText("Classe inválida para este item.")).toBeInTheDocument()
    );
  });
});
