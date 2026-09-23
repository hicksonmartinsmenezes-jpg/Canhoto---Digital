import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));
vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  rm: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/comprovantes-storage", () => ({
  diretorioRaizUploads: vi.fn(() => "/tmp/canhoto-test"),
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
  obterMotoristaAutorizado: vi.fn(),
}));
vi.mock("@/lib/motorista-session", () => ({
  encerrarSessaoMotorista: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { writeFile } from "node:fs/promises";
import { getDb } from "@/lib/db";
import { checarRateLimit } from "@/lib/rate-limit";
import { motoristaPodeAcessarEntrega } from "@/lib/motorista-authorization";
import { confirmarEntrega, iniciarEntrega } from "./actions";

const revalidatePathMock = vi.mocked(revalidatePath);
const writeFileMock = vi.mocked(writeFile);
const getDbMock = vi.mocked(getDb);
const checarRateLimitMock = vi.mocked(checarRateLimit);
const motoristaPodeAcessarEntregaMock = vi.mocked(
  motoristaPodeAcessarEntrega
);

const ENTREGA_ID = "11111111-1111-4111-8111-111111111111";

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

function criarSelect(resultados: Array<Array<{ id: string }>>) {
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

  return query;
}

function configurarDb({
  updateResultados = [[{ id: ENTREGA_ID }]],
  selectResultados = [[]],
  transacaoResultados = [[{ id: ENTREGA_ID }]],
}: {
  updateResultados?: Array<Array<{ id: string }>>;
  selectResultados?: Array<Array<{ id: string }>>;
  transacaoResultados?: Array<Array<{ id: string }>>;
} = {}) {
  const updateQuery = criarUpdate(updateResultados);
  const selectQuery = criarSelect(selectResultados);
  const txUpdateQuery = criarUpdate(transacaoResultados);
  const insertValues = vi.fn().mockResolvedValue(undefined);

  const tx = {
    update: vi.fn().mockReturnValue(txUpdateQuery),
    insert: vi.fn().mockReturnValue({
      values: insertValues,
    }),
  };

  const deleteQuery = {
    where: vi.fn().mockResolvedValue(undefined),
  };

  const db = {
    update: vi.fn().mockReturnValue(updateQuery),
    select: vi.fn().mockReturnValue(selectQuery),
    delete: vi.fn().mockReturnValue(deleteQuery),
    transaction: vi.fn(
      async (callback: (trx: typeof tx) => Promise<boolean>) => callback(tx)
    ),
  };

  getDbMock.mockReturnValue(
    db as unknown as NonNullable<ReturnType<typeof getDb>>
  );

  return {
    db,
    updateQuery,
    selectQuery,
    tx,
    txUpdateQuery,
    insertValues,
  };
}

const CABECALHO_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function criarFormDataAssinatura(): FormData {
  const formData = new FormData();
  formData.set(
    "assinatura",
    new File([CABECALHO_PNG], "assinatura.png", { type: "image/png" })
  );
  return formData;
}

function criarFormDataComprovante(): FormData {
  const formData = criarFormDataAssinatura();
  formData.set(
    "foto",
    new File([CABECALHO_PNG], "foto.png", { type: "image/png" })
  );
  return formData;
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
      selectResultados: [[]],
    });

    await expect(iniciarEntrega("entrega-1")).resolves.toEqual({ ok: true });
    await expect(iniciarEntrega("entrega-1")).resolves.toEqual({
      ok: false,
      error: "Entrega não encontrada ou já iniciada.",
    });
  });

  it("rejeita confirmação com identificador inválido antes de acessar o banco", async () => {
    await expect(
      confirmarEntrega("entrega-invalida", criarFormDataComprovante())
    ).resolves.toEqual({
      ok: false,
      error: "Entrega inválida.",
    });

    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("exige assinatura antes de confirmar", async () => {
    const formData = new FormData();

    await expect(confirmarEntrega(ENTREGA_ID, formData)).resolves.toEqual({
      ok: false,
      error: "Colete a assinatura do cliente antes de confirmar a entrega.",
    });

    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("aceita concluir a entrega sem foto quando há assinatura", async () => {
    const { insertValues } = configurarDb({
      selectResultados: [[{ id: ENTREGA_ID }]],
    });

    await expect(
      confirmarEntrega(ENTREGA_ID, criarFormDataAssinatura())
    ).resolves.toEqual({
      ok: true,
    });

    expect(writeFileMock).toHaveBeenCalledTimes(1);

    expect(insertValues).toHaveBeenCalledWith([
      expect.objectContaining({
        entregaId: ENTREGA_ID,
        tipo: "assinatura_cliente",
        capturadoPorMotoboy: "motorista-a",
      }),
    ]);

    expect(insertValues).toHaveBeenCalledWith({
      entregaId: ENTREGA_ID,
      statusAnterior: "pendente",
      statusNovo: "entregue",
      alteradoPorMotoboy: "motorista-a",
      observacao: "Entrega confirmada com assinatura do cliente.",
    });
  });

  it("rejeita foto inválida quando o motorista opta por enviá-la", async () => {
    const formData = criarFormDataAssinatura();
    formData.set(
      "foto",
      new File(["conteudo-invalido"], "foto.txt", { type: "text/plain" })
    );

    await expect(confirmarEntrega(ENTREGA_ID, formData)).resolves.toEqual({
      ok: false,
      error:
        "A foto do comprovante é opcional, mas quando enviada deve ser JPG, PNG, WEBP, HEIC ou HEIF com até 8 MB.",
    });

    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("confirma entrega iniciada com foto e assinatura e registra o motorista no histórico", async () => {
    const { tx, insertValues } = configurarDb({
      selectResultados: [[{ id: ENTREGA_ID }]],
    });

    await expect(
      confirmarEntrega(ENTREGA_ID, criarFormDataComprovante())
    ).resolves.toEqual({
      ok: true,
    });

    expect(tx.update).toHaveBeenCalledTimes(1);
    expect(writeFileMock).toHaveBeenCalledTimes(2);

    expect(insertValues).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          entregaId: ENTREGA_ID,
          tipo: "foto",
          capturadoPorMotoboy: "motorista-a",
        }),
        expect.objectContaining({
          entregaId: ENTREGA_ID,
          tipo: "assinatura_cliente",
          capturadoPorMotoboy: "motorista-a",
        }),
      ])
    );

    expect(insertValues).toHaveBeenCalledWith({
      entregaId: ENTREGA_ID,
      statusAnterior: "pendente",
      statusNovo: "entregue",
      alteradoPorMotoboy: "motorista-a",
      observacao: "Entrega confirmada com foto e assinatura do cliente.",
    });

    expect(revalidatePathMock).toHaveBeenCalledWith("/motorista");
    expect(revalidatePathMock).toHaveBeenCalledWith("/canhotos");
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
  });

  it("não confirma entrega que já não está disponível para conclusão", async () => {
    configurarDb({
      selectResultados: [[]],
    });

    await expect(
      confirmarEntrega(ENTREGA_ID, criarFormDataComprovante())
    ).resolves.toEqual({
      ok: false,
      error: "Entrega não encontrada, já concluída ou ainda não iniciada.",
    });

    expect(writeFileMock).not.toHaveBeenCalled();
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
