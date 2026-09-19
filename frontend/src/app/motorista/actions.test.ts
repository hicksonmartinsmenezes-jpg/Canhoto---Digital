import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  checarRateLimit: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}));
vi.mock("@/lib/motorista-authorization", () => ({
  ERRO_MOTORISTA_SESSAO: "Sessão expirada — faça login novamente.",
  motoristaPodeAcessarEntrega: vi.fn(),
}));
vi.mock("@/lib/motorista-session", () => ({
  encerrarSessaoMotorista: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { checarRateLimit } from "@/lib/rate-limit";
import { motoristaPodeAcessarEntrega } from "@/lib/motorista-authorization";
import { confirmarEntrega, iniciarEntrega } from "./actions";

const revalidatePathMock = vi.mocked(revalidatePath);
const getDbMock = vi.mocked(getDb);
const checarRateLimitMock = vi.mocked(checarRateLimit);
const motoristaPodeAcessarEntregaMock = vi.mocked(
  motoristaPodeAcessarEntrega
);

function criarUpdate(resultados: Array<Array<{ id: string }>>) {
  const query = {
    set: vi.fn(),
    where: vi.fn(),
    returning: vi.fn(),
  };
  query.set.mockReturnValue(query);
  query.where.mockReturnValue(query);

  for (const resultado of resultados) {
    query.returning.mockResolvedValueOnce(resultado);
  }

  return query;
}

function configurarDb({
  updateResultados = [[{ id: "entrega-1" }]],
  transacaoResultados = [[{ id: "entrega-1" }]],
}: {
  updateResultados?: Array<Array<{ id: string }>>;
  transacaoResultados?: Array<Array<{ id: string }>>;
} = {}) {
  const updateQuery = criarUpdate(updateResultados);
  const txUpdateQuery = criarUpdate(transacaoResultados);
  const insertValues = vi.fn().mockResolvedValue(undefined);

  const tx = {
    update: vi.fn().mockReturnValue(txUpdateQuery),
    insert: vi.fn().mockReturnValue({
      values: insertValues,
    }),
  };

  const db = {
    update: vi.fn().mockReturnValue(updateQuery),
    transaction: vi.fn(
      async (callback: (trx: typeof tx) => Promise<boolean>) => callback(tx)
    ),
  };

  getDbMock.mockReturnValue(
    db as unknown as NonNullable<ReturnType<typeof getDb>>
  );

  return { db, updateQuery, tx, txUpdateQuery, insertValues };
}

describe("ações do motorista com PostgreSQL local", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checarRateLimitMock.mockResolvedValue({
      permitido: true,
      restante: 9,
    });
    motoristaPodeAcessarEntregaMock.mockResolvedValue({
      motoboyId: "motorista-a",
    });
  });

  it("inicia a entrega somente uma vez", async () => {
    configurarDb({
      updateResultados: [[{ id: "entrega-1" }], []],
    });

    await expect(iniciarEntrega("entrega-1")).resolves.toEqual({ ok: true });
    await expect(iniciarEntrega("entrega-1")).resolves.toEqual({
      ok: false,
      error: "Entrega não encontrada ou já iniciada.",
    });
  });

  it("confirma entrega iniciada e registra o motorista no histórico", async () => {
    const { tx, insertValues } = configurarDb();

    await expect(confirmarEntrega("entrega-1")).resolves.toEqual({
      ok: true,
    });

    expect(tx.update).toHaveBeenCalledTimes(1);
    expect(insertValues).toHaveBeenCalledWith({
      entregaId: "entrega-1",
      statusAnterior: "pendente",
      statusNovo: "entregue",
      alteradoPorMotoboy: "motorista-a",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/motorista");
  });

  it("não confirma entrega ainda não iniciada", async () => {
    const { insertValues } = configurarDb({
      transacaoResultados: [[]],
    });

    await expect(confirmarEntrega("entrega-1")).resolves.toEqual({
      ok: false,
      error: "Entrega não encontrada ou ainda não iniciada.",
    });
    expect(insertValues).not.toHaveBeenCalled();
  });

  it("não confirma a mesma entrega duas vezes", async () => {
    const { insertValues } = configurarDb({
      transacaoResultados: [[{ id: "entrega-1" }], []],
    });

    await expect(confirmarEntrega("entrega-1")).resolves.toEqual({
      ok: true,
    });
    await expect(confirmarEntrega("entrega-1")).resolves.toEqual({
      ok: false,
      error: "Entrega não encontrada ou ainda não iniciada.",
    });

    expect(insertValues).toHaveBeenCalledTimes(1);
  });

  it("não acessa o banco quando a entrega pertence a outro motorista", async () => {
    motoristaPodeAcessarEntregaMock.mockResolvedValue(null);

    await expect(iniciarEntrega("entrega-de-outro")).resolves.toEqual({
      ok: false,
      error: "Sessão expirada — faça login novamente.",
    });
    expect(getDbMock).not.toHaveBeenCalled();
  });
});
