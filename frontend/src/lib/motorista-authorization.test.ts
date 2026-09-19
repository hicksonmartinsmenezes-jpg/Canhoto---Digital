import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/motorista-session", () => ({
  obterMotoboyIdDaSessao: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import { obterMotoboyIdDaSessao } from "@/lib/motorista-session";
import {
  motoristaPodeAcessarEntrega,
  obterMotoristaAutorizado,
} from "./motorista-authorization";

const obterMotoboyIdDaSessaoMock = vi.mocked(obterMotoboyIdDaSessao);
const createAdminClientMock = vi.mocked(createAdminClient);

function criarQuery(data: { id: string } | null) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };

  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);

  return query;
}

function configurarSupabase(
  motoboy: { id: string } | null,
  entrega: { id: string } | null = null
) {
  const motoboysQuery = criarQuery(motoboy);
  const entregasQuery = criarQuery(entrega);

  const from = vi.fn((tabela: string) => {
    if (tabela === "motoboys") return motoboysQuery;
    if (tabela === "entregas") return entregasQuery;
    throw new Error(`Tabela inesperada no teste: ${tabela}`);
  });

  createAdminClientMock.mockReturnValue({
    from,
  } as unknown as NonNullable<ReturnType<typeof createAdminClient>>);

  return { from, motoboysQuery, entregasQuery };
}

describe("autorização do motorista", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejeita acesso quando não existe sessão válida", async () => {
    obterMotoboyIdDaSessaoMock.mockResolvedValue(null);

    await expect(obterMotoristaAutorizado()).resolves.toBeNull();
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });

  it("aceita somente motorista que continua ativo no banco", async () => {
    obterMotoboyIdDaSessaoMock.mockResolvedValue("motorista-a");
    const { motoboysQuery } = configurarSupabase({ id: "motorista-a" });

    await expect(obterMotoristaAutorizado()).resolves.toBe("motorista-a");
    expect(motoboysQuery.eq).toHaveBeenCalledWith("id", "motorista-a");
    expect(motoboysQuery.eq).toHaveBeenCalledWith("ativo", true);
  });

  it("rejeita motorista inativo ou removido", async () => {
    obterMotoboyIdDaSessaoMock.mockResolvedValue("motorista-inativo");
    configurarSupabase(null);

    await expect(obterMotoristaAutorizado()).resolves.toBeNull();
  });

  it("permite acesso quando a entrega pertence ao motorista autenticado", async () => {
    obterMotoboyIdDaSessaoMock.mockResolvedValue("motorista-a");
    const { entregasQuery } = configurarSupabase(
      { id: "motorista-a" },
      { id: "entrega-a" }
    );

    await expect(motoristaPodeAcessarEntrega("entrega-a")).resolves.toEqual({
      motoboyId: "motorista-a",
    });
    expect(entregasQuery.eq).toHaveBeenCalledWith("id", "entrega-a");
    expect(entregasQuery.eq).toHaveBeenCalledWith("motoboy_id", "motorista-a");
  });

  it("bloqueia acesso cruzado a uma entrega de outro motorista", async () => {
    obterMotoboyIdDaSessaoMock.mockResolvedValue("motorista-a");
    const { entregasQuery } = configurarSupabase({ id: "motorista-a" }, null);

    await expect(motoristaPodeAcessarEntrega("entrega-do-motorista-b")).resolves.toBeNull();
    expect(entregasQuery.eq).toHaveBeenCalledWith(
      "id",
      "entrega-do-motorista-b"
    );
    expect(entregasQuery.eq).toHaveBeenCalledWith("motoboy_id", "motorista-a");
  });
});
