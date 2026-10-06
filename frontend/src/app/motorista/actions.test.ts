import path from "node:path";
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
  diretorioRelativoEntrega: vi.fn(
    (clienteNome: string, numeroEntrega: number) =>
      `entregas/${clienteNome.toLowerCase().replace(/\s+/g, "-")}/entrega-${String(numeroEntrega).padStart(6, "0")}`
  ),
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

type SelectRow = {
  id: string;
  numero?: number;
  clienteNome?: string;
  formaPagamento?: "dinheiro" | "pix" | "debito" | "cartao_1x" | "prazo";
};

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

function criarSelect(resultados: Array<Array<SelectRow>>) {
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
  selectResultados?: Array<Array<SelectRow>>;
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

function arquivoPng(nome: string): File {
  return new File([CABECALHO_PNG], nome, { type: "image/png" });
}

function criarFormDataEntrega({
  comprovantePix = false,
}: {
  comprovantePix?: boolean;
} = {}): FormData {
  const formData = new FormData();
  formData.set("fotoEntrega", arquivoPng("entrega.png"));
  formData.set("assinatura", arquivoPng("assinatura.png"));

  if (comprovantePix) {
    formData.set("comprovantePix", arquivoPng("comprovante-pix.png"));
  }

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
      confirmarEntrega("entrega-invalida", criarFormDataEntrega())
    ).resolves.toEqual({
      ok: false,
      error: "Entrega inválida.",
    });

    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("exige foto da entrega antes de confirmar", async () => {
    const formData = new FormData();
    formData.set("assinatura", arquivoPng("assinatura.png"));

    await expect(confirmarEntrega(ENTREGA_ID, formData)).resolves.toEqual({
      ok: false,
      error:
        "Tire uma foto válida da entrega (JPG, PNG, WEBP, HEIC ou HEIF, até 8 MB).",
    });

    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("exige assinatura depois da foto da entrega", async () => {
    const formData = new FormData();
    formData.set("fotoEntrega", arquivoPng("entrega.png"));

    await expect(confirmarEntrega(ENTREGA_ID, formData)).resolves.toEqual({
      ok: false,
      error: "Colete a assinatura do cliente antes de confirmar a entrega.",
    });

    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("confirma entrega não Pix com foto da entrega e assinatura", async () => {
    const { db, tx, insertValues } = configurarDb({
      selectResultados: [[{ id: ENTREGA_ID, numero: 123, clienteNome: "Cliente Teste", formaPagamento: "dinheiro" }], []],
    });

    await expect(
      confirmarEntrega(ENTREGA_ID, criarFormDataEntrega())
    ).resolves.toEqual({
      ok: true,
    });

    expect(tx.update).toHaveBeenCalledTimes(1);
    // Sem outra entrega em rota: a última posição do motorista é apagada.
    expect(db.delete).toHaveBeenCalledTimes(1);
    expect(writeFileMock).toHaveBeenCalledTimes(2);
    expect(writeFileMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "entregas/cliente-teste/entrega-000123".replaceAll("/", path.sep)
      ),
      expect.any(Uint8Array),
      { flag: "wx" }
    );

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
      observacao: "Entrega confirmada com foto da entrega e assinatura do cliente.",
    });
  });

  it("permite entrega Pix sem comprovante de pagamento", async () => {
    const { insertValues } = configurarDb({
      selectResultados: [[{ id: ENTREGA_ID, numero: 123, clienteNome: "Cliente Teste", formaPagamento: "pix" }], []],
    });

    await expect(
      confirmarEntrega(ENTREGA_ID, criarFormDataEntrega())
    ).resolves.toEqual({
      ok: true,
    });

    expect(writeFileMock).toHaveBeenCalledTimes(2);

    const anexos = insertValues.mock.calls.find(
      ([valor]) => Array.isArray(valor)
    )?.[0] as Array<{ tipo: string }> | undefined;

    expect(anexos?.some((anexo) => anexo.tipo === "comprovante_pix")).toBe(
      false
    );
  });

  it("salva comprovante Pix separado quando o motorista envia", async () => {
    const { insertValues } = configurarDb({
      selectResultados: [[{ id: ENTREGA_ID, numero: 123, clienteNome: "Cliente Teste", formaPagamento: "pix" }], []],
    });

    await expect(
      confirmarEntrega(
        ENTREGA_ID,
        criarFormDataEntrega({ comprovantePix: true })
      )
    ).resolves.toEqual({
      ok: true,
    });

    expect(writeFileMock).toHaveBeenCalledTimes(3);

    expect(insertValues).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          entregaId: ENTREGA_ID,
          tipo: "foto",
          capturadoPorMotoboy: "motorista-a",
        }),
        expect.objectContaining({
          entregaId: ENTREGA_ID,
          tipo: "comprovante_pix",
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
      observacao:
        "Entrega confirmada com foto da entrega, comprovante Pix e assinatura do cliente.",
    });
  });

  it("rejeita comprovante Pix inválido quando informado", async () => {
    const formData = criarFormDataEntrega();
    formData.set(
      "comprovantePix",
      new File(["conteudo-invalido"], "comprovante.txt", {
        type: "text/plain",
      })
    );

    await expect(confirmarEntrega(ENTREGA_ID, formData)).resolves.toEqual({
      ok: false,
      error:
        "O comprovante Pix deve ser uma imagem JPG, PNG, WEBP, HEIC ou HEIF com até 8 MB.",
    });

    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("não confirma entrega que já não está disponível para conclusão", async () => {
    configurarDb({
      selectResultados: [[]],
    });

    await expect(
      confirmarEntrega(ENTREGA_ID, criarFormDataEntrega())
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

  it("revalida as telas após confirmar a entrega", async () => {
    configurarDb({
      selectResultados: [[{ id: ENTREGA_ID, numero: 123, clienteNome: "Cliente Teste", formaPagamento: "dinheiro" }]],
    });

    await confirmarEntrega(ENTREGA_ID, criarFormDataEntrega());

    expect(revalidatePathMock).toHaveBeenCalledWith("/motorista");
    expect(revalidatePathMock).toHaveBeenCalledWith("/canhotos");
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
  });
  it("mantém a localização do motorista quando ainda há outra entrega em rota", async () => {
    const { db } = configurarDb({
      selectResultados: [
        [{ id: ENTREGA_ID, numero: 123, clienteNome: "Cliente Teste", formaPagamento: "dinheiro" }],
        [{ id: "outra-entrega" }],
      ],
    });

    await expect(
      confirmarEntrega(ENTREGA_ID, criarFormDataEntrega())
    ).resolves.toEqual({ ok: true });

    expect(db.delete).not.toHaveBeenCalled();
  });
});
