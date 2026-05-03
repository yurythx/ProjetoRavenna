import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { QuestTracker } from "./QuestTracker";
import type { QuestProgress } from "@/types";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function makeQuest(overrides: Partial<QuestProgress> = {}): QuestProgress {
  return {
    id: "quest-0001",
    quest_id: "tmpl-0001",
    status: "in_progress",
    current_objectives: { kill_wolf: 3 },
    started_at: "2025-01-01T00:00:00Z",
    completed_at: null,
    quest_name: "Caçador de Lobos",
    quest_objectives: [{ key: "kill_wolf", description: "Matar lobos", target_count: 5 }],
    quest_rewards: { xp: 200, gold: 50 },
    quest_type: "side",
    ...overrides,
  };
}

describe("QuestTracker", () => {
  it("exibe skeleton enquanto carrega", () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Promise(() => {})));
    const { container } = render(<QuestTracker />, { wrapper });
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("exibe mensagem quando não há missões ativas", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json([])));
    render(<QuestTracker />, { wrapper });
    await waitFor(() =>
      expect(screen.getByText(/Nenhuma missão ativa/i)).toBeInTheDocument()
    );
  });

  it("exibe card de missão ativa com nome", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json([makeQuest()])));
    render(<QuestTracker />, { wrapper });
    await waitFor(() =>
      expect(screen.getByText("Caçador de Lobos")).toBeInTheDocument()
    );
  });

  it("exibe progresso do objetivo com contagem", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json([makeQuest()])));
    render(<QuestTracker />, { wrapper });
    await waitFor(() =>
      expect(screen.getByText("3/5")).toBeInTheDocument()
    );
  });

  it("exibe descrição do objetivo", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json([makeQuest()])));
    render(<QuestTracker />, { wrapper });
    await waitFor(() =>
      expect(screen.getByText("Matar lobos")).toBeInTheDocument()
    );
  });

  it("exibe recompensa de XP", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json([makeQuest()])));
    render(<QuestTracker />, { wrapper });
    await waitFor(() =>
      expect(screen.getByText(/200.*XP/i)).toBeInTheDocument()
    );
  });

  it("exibe recompensa de ouro", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json([makeQuest()])));
    render(<QuestTracker />, { wrapper });
    await waitFor(() =>
      expect(screen.getByText(/50.*g/)).toBeInTheDocument()
    );
  });

  it("missão concluída não aparece por padrão", async () => {
    const completed = makeQuest({
      id: "quest-done",
      status: "completed",
      quest_name: "Missão Concluída",
    });
    vi.stubGlobal("fetch", vi.fn(async () => json([completed])));
    render(<QuestTracker />, { wrapper });
    await waitFor(() =>
      expect(screen.getByText(/Concluídas \(1\)/i)).toBeInTheDocument()
    );
    expect(screen.queryByText("Missão Concluída")).not.toBeInTheDocument();
  });

  it("clicar em Concluídas revela missão concluída", async () => {
    const completed = makeQuest({
      id: "quest-done",
      status: "completed",
      quest_name: "Missão Concluída",
    });
    vi.stubGlobal("fetch", vi.fn(async () => json([completed])));
    const user = userEvent.setup();
    render(<QuestTracker />, { wrapper });
    await waitFor(() =>
      expect(screen.getByText(/Concluídas \(1\)/i)).toBeInTheDocument()
    );
    await user.click(screen.getByText(/Concluídas \(1\)/i));
    expect(screen.getByText("Missão Concluída")).toBeInTheDocument();
  });

  it("badge de tipo de missão principal aparece", async () => {
    const main = makeQuest({ quest_type: "main", quest_name: "História Principal" });
    vi.stubGlobal("fetch", vi.fn(async () => json([main])));
    render(<QuestTracker />, { wrapper });
    await waitFor(() =>
      expect(screen.getByText("Principal")).toBeInTheDocument()
    );
  });

  it("objetivo completo (count >= target) exibe ✓", async () => {
    const quest = makeQuest({
      current_objectives: { kill_wolf: 5 },
      quest_objectives: [{ key: "kill_wolf", description: "Matar lobos", target_count: 5 }],
    });
    vi.stubGlobal("fetch", vi.fn(async () => json([quest])));
    render(<QuestTracker />, { wrapper });
    await waitFor(() =>
      expect(screen.getByText("5/5")).toBeInTheDocument()
    );
    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("exibe mensagem de erro quando fetch falha", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ error: "Server error" }, 500)));
    render(<QuestTracker />, { wrapper });
    await waitFor(() =>
      expect(screen.getByText(/Erro ao carregar missões/i)).toBeInTheDocument()
    );
  });
});
