import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));
vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  rm: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/comprovantes-storage", () => ({
  diretorioRaizUploads: () => "/tmp/canhoto-digital-test",
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

const ENTREGA_ID = "11111111-1111-4111-8111-111111111111";

function criarComprovantes(): FormData {
  const pngMinimo = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);
  const formData = new FormData();
  formData.set(
    "foto",
    new File([pngMinimo], "foto.png", { type: "image/png" })
  );
  formData.set(
    "assinatura",
    new File([pngMinimo], "assinatura.png", { type: "image/png" })
  );
  return formData;
}

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
  updateResultados = [[{ id: ENTREGA_ID }]],
  transacaoResultados = [[{ id: ENTREGA_ID }]],
  selectResultado = [{ id: ENTREGA_ID }],
}: {
  updateResultados?: Array<Array<{ id: string }>>;
  transacaoResultados?: Array<Array<{ id: string }>>;
  selectResultado?: Array<{ id: string }>;
} = {}) {
  const updateQuery = criarUpdate(updateResultados);
  const txUpdateQuery = criarUpdate(transacaoResultados);
  const insertValues = vi.fn().mockResolvedValue(undefined);
  const selectQuery = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn().mockResolvedValue(selectResultado),
  };
  selectQuery.from.mockReturnValue(selectQuery);
  selectQuery.where.mockReturnValue(selectQuery);

  const tx = {
    update: vi.fn().mockReturnValue(txUpdateQuery),
    insert: vi.fn().mockReturnValue({
      values: insertValues,
    }),
  };

  const db = {
    update: vi.fn().mockReturnValue(updateQuery),
    select: vi.fn().mockReturnValue(selectQuery),
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
      updateResultados: [[{ id: ENTREGA_ID }], []],
    });

    await expect(iniciarEntrega(ENTREGA_ID)).resolves.toEqual({ ok: true });
    await expect(iniciarEntrega(ENTREGA_ID)).resolves.toEqual({
      ok: false,
      error: "Entrega não encontrada ou já iniciada.",
    });
  });

  it("confirma entrega iniciada e registra o motorista no histórico", async () => {
    const { tx, insertValues } = configurarDb();

    await expect(
      confirmarEntrega(ENTREGA_ID, criarComprovantes())
    ).resolves.toEqual({
      ok: true,
    });

    expect(tx.update).toHaveBeenCalledTimes(1);
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        entregaId: ENTREGA_ID,
        statusAnterior: "pendente",
        statusNovo: "entregue",
        alteradoPorMotoboy: "motorista-a",
      })
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/motorista");
  });

  it("não confirma entrega ainda não iniciada", async () => {
    const { insertValues } = configurarDb({
      selectResultado: [],
    });

    await expect(
      confirmarEntrega(ENTREGA_ID, criarComprovantes())
    ).resolves.toEqual({
      ok: false,
      error: "Entrega não encontrada, já concluída ou ainda não iniciada.",
    });
    expect(insertValues).not.toHaveBeenCalled();
  });

  it("não confirma a mesma entrega duas vezes", async () => {
    const { insertValues } = configurarDb({
      transacaoResultados: [[{ id: ENTREGA_ID }], []],
    });

    await expect(
      confirmarEntrega(ENTREGA_ID, criarComprovantes())
    ).resolves.toEqual({
      ok: true,
    });
    await expect(
      confirmarEntrega(ENTREGA_ID, criarComprovantes())
    ).resolves.toEqual({
      ok: false,
      error: "Entrega já concluída ou não está mais disponível.",
    });

    expect(insertValues).toHaveBeenCalledTimes(2);
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
