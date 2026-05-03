import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PartyPanel } from "./PartyPanel";
import type { Party } from "@/types";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const USER_ID = "aaaa-0000-0000-0000-000000000001";

function makeParty(overrides: Partial<Party> = {}): Party {
  return {
    id: "party-0001",
    leader_id: USER_ID,
    members: [
      { user_id: USER_ID, display_name: "HeroLeader" },
    ],
    ...overrides,
  };
}

describe("PartyPanel", () => {
  it("exibe skeleton enquanto carrega", () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Promise(() => {})));
    const { container } = render(<PartyPanel userId={USER_ID} />, { wrapper });
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("exibe estado sem grupo quando 404", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ error: "not in a party" }, 404)));
    render(<PartyPanel userId={USER_ID} />, { wrapper });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Criar Grupo/i })).toBeInTheDocument(),
      { timeout: 3000 }
    );
    expect(screen.getByText(/Você não está em nenhum grupo/i)).toBeInTheDocument();
  });

  it("criar grupo chama POST /api/game/party e recarrega", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(json({ error: "not in a party" }, 404))
      .mockResolvedValueOnce(json({ ok: true }, 201))
      .mockResolvedValueOnce(json(makeParty()));

    vi.stubGlobal("fetch", fetchMock);
    render(<PartyPanel userId={USER_ID} />, { wrapper });

    await waitFor(() => expect(screen.getByRole("button", { name: /Criar Grupo/i })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Criar Grupo/i }));

    expect(fetchMock).toHaveBeenCalledWith("/api/game/party", expect.objectContaining({ method: "POST" }));
  });

  it("exibe lista de membros quando há grupo", async () => {
    const party = makeParty({
      members: [
        { user_id: USER_ID, display_name: "HeroLeader" },
        { user_id: "bbbb-0000", display_name: "AllyFighter" },
      ],
    });
    vi.stubGlobal("fetch", vi.fn(async () => json(party)));
    render(<PartyPanel userId={USER_ID} />, { wrapper });
    await waitFor(() => expect(screen.getByText("HeroLeader")).toBeInTheDocument());
    expect(screen.getByText("AllyFighter")).toBeInTheDocument();
  });

  it("badge Líder aparece para o líder do grupo", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(makeParty())));
    render(<PartyPanel userId={USER_ID} />, { wrapper });
    await waitFor(() => expect(screen.getByText("Líder")).toBeInTheDocument());
  });

  it("texto (você) aparece para o usuário atual", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(makeParty())));
    render(<PartyPanel userId={USER_ID} />, { wrapper });
    await waitFor(() => expect(screen.getByText("(você)")).toBeInTheDocument());
  });

  it("campo de convite aparece para o líder com grupo não cheio", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(makeParty())));
    render(<PartyPanel userId={USER_ID} />, { wrapper });
    await waitFor(() => expect(screen.getByPlaceholderText(/ID do jogador/i)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Convidar/i })).toBeInTheDocument();
  });

  it("campo de convite não aparece para membro não-líder", async () => {
    const OTHER_ID = "cccc-0000-0000-0000-000000000003";
    const party = makeParty({ leader_id: OTHER_ID, members: [{ user_id: USER_ID, display_name: "Me" }, { user_id: OTHER_ID, display_name: "Leader" }] });
    vi.stubGlobal("fetch", vi.fn(async () => json(party)));
    render(<PartyPanel userId={USER_ID} />, { wrapper });
    await waitFor(() => expect(screen.getByText("Me")).toBeInTheDocument());
    expect(screen.queryByPlaceholderText(/ID do jogador/i)).not.toBeInTheDocument();
  });

  it("convidar chama POST /api/game/party/invite com user_id", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(json(makeParty()))
      .mockResolvedValueOnce(json({ ok: true }))
      .mockResolvedValueOnce(json(makeParty()))
    );
    render(<PartyPanel userId={USER_ID} />, { wrapper });
    await waitFor(() => expect(screen.getByPlaceholderText(/ID do jogador/i)).toBeInTheDocument());
    await user.type(screen.getByPlaceholderText(/ID do jogador/i), "target-uuid");
    await user.click(screen.getByRole("button", { name: /Convidar/i }));

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "/api/game/party/invite",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("erro ao convidar exibe mensagem de erro", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(json(makeParty()))
      .mockResolvedValueOnce(json({ error: "Jogador não encontrado." }, 400))
    );
    render(<PartyPanel userId={USER_ID} />, { wrapper });
    await waitFor(() => expect(screen.getByPlaceholderText(/ID do jogador/i)).toBeInTheDocument());
    await user.type(screen.getByPlaceholderText(/ID do jogador/i), "unknown-id");
    await user.click(screen.getByRole("button", { name: /Convidar/i }));

    await waitFor(() =>
      expect(screen.getByText("Jogador não encontrado.")).toBeInTheDocument()
    );
  });

  it("grupo cheio exibe mensagem e esconde campo de convite", async () => {
    const party = makeParty({
      members: [
        { user_id: USER_ID, display_name: "L" },
        { user_id: "u2", display_name: "M2" },
        { user_id: "u3", display_name: "M3" },
        { user_id: "u4", display_name: "M4" },
        { user_id: "u5", display_name: "M5" },
      ],
    });
    vi.stubGlobal("fetch", vi.fn(async () => json(party)));
    render(<PartyPanel userId={USER_ID} />, { wrapper });
    await waitFor(() => expect(screen.getByText(/Grupo completo/i)).toBeInTheDocument());
    expect(screen.queryByPlaceholderText(/ID do jogador/i)).not.toBeInTheDocument();
  });

  it("botão Dissolver aparece para líder", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(makeParty())));
    render(<PartyPanel userId={USER_ID} />, { wrapper });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Dissolver grupo/i })).toBeInTheDocument()
    );
  });

  it("botão Sair aparece para membro não-líder", async () => {
    const OTHER_ID = "cccc-0000";
    const party = makeParty({ leader_id: OTHER_ID, members: [{ user_id: USER_ID, display_name: "Me" }, { user_id: OTHER_ID, display_name: "Leader" }] });
    vi.stubGlobal("fetch", vi.fn(async () => json(party)));
    render(<PartyPanel userId={USER_ID} />, { wrapper });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Sair do grupo/i })).toBeInTheDocument()
    );
  });

  it("sair do grupo chama DELETE /api/game/party", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(json(makeParty()))
      .mockResolvedValueOnce(json({ ok: true }))
      .mockResolvedValueOnce(json({ error: "not in a party" }, 404))
    );
    render(<PartyPanel userId={USER_ID} />, { wrapper });
    await waitFor(() => expect(screen.getByRole("button", { name: /Dissolver grupo/i })).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /Dissolver grupo/i }));

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "/api/game/party",
      expect.objectContaining({ method: "DELETE" })
    );
  });
});
