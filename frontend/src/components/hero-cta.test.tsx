import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi, describe, it, expect, beforeEach } from "vitest";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/components/auth-provider", () => ({
  useAuth: vi.fn(),
}));

import { HeroCta } from "@/components/hero-cta";
import { useAuth } from "@/components/auth-provider";

function mockAuth(overrides: Partial<ReturnType<typeof useAuth>>) {
  vi.mocked(useAuth).mockReturnValue({
    user: null,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshSession: vi.fn(),
    ...overrides,
  } as ReturnType<typeof useAuth>);
}

describe("HeroCta", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("mostra skeleton enquanto carrega", () => {
    mockAuth({ isLoading: true });
    render(<HeroCta />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("mostra links de registro quando não logado", () => {
    mockAuth({ user: null, isLoading: false });
    render(<HeroCta />);
    expect(screen.getByText(/Iniciar Jornada/i)).toBeInTheDocument();
    expect(screen.getByText(/Explorar Fórum/i)).toBeInTheDocument();
  });

  it("não mostra botão de jogar quando não logado", () => {
    mockAuth({ user: null, isLoading: false });
    render(<HeroCta />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("mostra botão de jogar quando logado", () => {
    mockAuth({ user: { id: "u1" }, isLoading: false });
    render(<HeroCta />);
    expect(screen.getByRole("button", { name: /Entrar no Servidor/i })).toBeInTheDocument();
  });

  it("mostra link para Meu Herói quando logado", () => {
    mockAuth({ user: { id: "u1" }, isLoading: false });
    render(<HeroCta />);
    expect(screen.getByText(/Meu Herói/i)).toBeInTheDocument();
  });

  it("navega para unity-callback com client_id ao clicar em Jogar", async () => {
    mockAuth({ user: { id: "u1" }, isLoading: false });
    vi.stubGlobal("crypto", { randomUUID: () => "fixed-uuid-1234" });

    render(<HeroCta />);
    await userEvent.click(screen.getByRole("button", { name: /Entrar no Servidor/i }));

    expect(mockPush).toHaveBeenCalledWith(
      "/auth/unity-callback?client_id=fixed-uuid-1234"
    );
  });
});
