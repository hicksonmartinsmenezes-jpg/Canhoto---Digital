import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/motorista-session", () => ({
  obterMotoboyIdDaSessao: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "@/lib/db";
import { obterMotoboyIdDaSessao } from "@/lib/motorista-session";
import {
  motoristaPodeAcessarEntrega,
  obterMotoristaAutorizado,
} from "./motorista-authorization";

const getDbMock = vi.mocked(getDb);
const obterMotoboyIdDaSessaoMock = vi.mocked(obterMotoboyIdDaSessao);

function criarSelect(resultados: unknown[][]) {
  const query = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
  };

  query.from.mockReturnValue(query);
  query.where.mockReturnValue(query);

  for (const resultado of resultados) {
    query.limit.mockResolvedValueOnce(resultado);
  }

  const select = vi.fn().mockReturnValue(query);
  getDbMock.mockReturnValue({
    select,
  } as unknown as NonNullable<ReturnType<typeof getDb>>);

  return { select, query };
}

describe("autorização do motorista com Drizzle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejeita quando não existe sessão válida", async () => {
    obterMotoboyIdDaSessaoMock.mockResolvedValue(null);

    await expect(obterMotoristaAutorizado()).resolves.toBeNull();
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("aceita somente motorista ativo", async () => {
    obterMotoboyIdDaSessaoMock.mockResolvedValue("motorista-a");
    criarSelect([[{ id: "motorista-a" }]]);

    await expect(obterMotoristaAutorizado()).resolves.toBe("motorista-a");
  });

  it("rejeita motorista inativo ou removido", async () => {
    obterMotoboyIdDaSessaoMock.mockResolvedValue("motorista-inativo");
    criarSelect([[]]);

    await expect(obterMotoristaAutorizado()).resolves.toBeNull();
  });

  it("permite somente entrega pertencente ao motorista autenticado", async () => {
    obterMotoboyIdDaSessaoMock.mockResolvedValue("motorista-a");
    criarSelect([
      [{ id: "motorista-a" }],
      [{ id: "entrega-a" }],
    ]);

    await expect(motoristaPodeAcessarEntrega("entrega-a")).resolves.toEqual({
      motoboyId: "motorista-a",
    });
  });

  it("bloqueia acesso cruzado entre motoristas", async () => {
    obterMotoboyIdDaSessaoMock.mockResolvedValue("motorista-a");
    criarSelect([[{ id: "motorista-a" }], []]);

    await expect(
      motoristaPodeAcessarEntrega("entrega-do-motorista-b")
    ).resolves.toBeNull();
  });
});
