import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/operador-auth", () => ({
  obterOperadorAutenticado: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  checarRateLimit: vi.fn(),
}));

import { getDb } from "@/lib/db";
import { obterOperadorAutenticado } from "@/lib/operador-auth";
import { checarRateLimit } from "@/lib/rate-limit";
import { lancarNotaFiscal } from "./nota-actions";

const getDbMock = vi.mocked(getDb);
const obterOperadorAutenticadoMock = vi.mocked(obterOperadorAutenticado);
const checarRateLimitMock = vi.mocked(checarRateLimit);

const ENTREGA_ID = "11111111-1111-4111-8111-111111111111";
const SETOR_ID = "22222222-2222-4222-8222-222222222222";

type EntregaAtual = {
  status: "pendente" | "entregue" | "cancelado";
  setorId: string | null;
  clienteFinal: boolean;
  numeroNfe: string | null;
};

function configurarDb(
  atual: Partial<EntregaAtual> = {},
  { gravou = true }: { gravou?: boolean } = {}
) {
  const selectQuery = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn().mockResolvedValue([
      {
        status: "entregue",
        setorId: SETOR_ID,
        clienteFinal: false,
        numeroNfe: null,
        ...atual,
      },
    ]),
  };
  selectQuery.from.mockReturnValue(selectQuery);
  selectQuery.where.mockReturnValue(selectQuery);

  const updateQuery = {
    set: vi.fn(),
    where: vi.fn(),
    returning: vi
      .fn()
      .mockResolvedValue(gravou ? [{ id: ENTREGA_ID }] : []),
  };
  updateQuery.set.mockReturnValue(updateQuery);
  updateQuery.where.mockReturnValue(updateQuery);

  const insertValues = vi.fn().mockResolvedValue(undefined);

  const tx = {
    select: vi.fn().mockReturnValue(selectQuery),
    update: vi.fn().mockReturnValue(updateQuery),
    insert: vi.fn().mockReturnValue({ values: insertValues }),
  };

  const db = {
    transaction: vi.fn(
      async (callback: (trx: typeof tx) => Promise<unknown>) => callback(tx)
    ),
  };

  getDbMock.mockReturnValue(
    db as unknown as NonNullable<ReturnType<typeof getDb>>
  );

  return { tx, updateQuery, insertValues };
}

describe("lancarNotaFiscal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obterOperadorAutenticadoMock.mockResolvedValue({
      tipo: "gestor_setor",
      colaboradorId: "colab-1",
      setorId: SETOR_ID,
    });
    checarRateLimitMock.mockResolvedValue({ permitido: true, restante: 9 });
  });

  it("colaboradora lança a nota de uma entrega já concluída", async () => {
    const { updateQuery, insertValues } = configurarDb();

    await expect(lancarNotaFiscal(ENTREGA_ID, " 12345 ")).resolves.toEqual({
      ok: true,
    });

    expect(updateQuery.set).toHaveBeenCalledWith({ numeroNfe: "12345" });
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        entregaId: ENTREGA_ID,
        alteradoPor: "colab-1",
        alteradoPorAdmin: null,
        observacao: "NF-e: sem número → 12345",
      })
    );
  });

  it("recusa entrega de outra unidade", async () => {
    const { tx } = configurarDb({ setorId: "outro-setor" });

    await expect(lancarNotaFiscal(ENTREGA_ID, "12345")).resolves.toEqual({
      ok: false,
      error: "Entrega de outra unidade.",
    });
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("não troca número já gravado", async () => {
    const { tx } = configurarDb({ numeroNfe: "999" });

    const resultado = await lancarNotaFiscal(ENTREGA_ID, "12345");

    expect(resultado.ok).toBe(false);
    expect(resultado.error).toMatch(/já tem número de NF-e/);
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("recusa venda marcada como consumidor final", async () => {
    const { tx } = configurarDb({ clienteFinal: true });

    const resultado = await lancarNotaFiscal(ENTREGA_ID, "12345");

    expect(resultado.ok).toBe(false);
    expect(resultado.error).toMatch(/consumidor final/);
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("recusa entrega cancelada", async () => {
    const { tx } = configurarDb({ status: "cancelado" });

    const resultado = await lancarNotaFiscal(ENTREGA_ID, "12345");

    expect(resultado.ok).toBe(false);
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("avisa quando outra pessoa lançou a nota antes", async () => {
    const { insertValues } = configurarDb({}, { gravou: false });

    const resultado = await lancarNotaFiscal(ENTREGA_ID, "12345");

    expect(resultado.ok).toBe(false);
    expect(resultado.error).toMatch(/outra pessoa/);
    expect(insertValues).not.toHaveBeenCalled();
  });

  it("exige número e sessão", async () => {
    configurarDb();
    await expect(lancarNotaFiscal(ENTREGA_ID, "   ")).resolves.toEqual({
      ok: false,
      error: "Informe o número da NF-e.",
    });

    obterOperadorAutenticadoMock.mockResolvedValue(null);
    await expect(lancarNotaFiscal(ENTREGA_ID, "12345")).resolves.toEqual({
      ok: false,
      error: "Sessão inválida ou expirada.",
    });
  });
});
