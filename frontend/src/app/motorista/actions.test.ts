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
      `entregas/${clienteNome.toLowerCase().replace(/\s+/g, "-")}/entrega-${String(numeroEntrega).padStart(6, "0")}`,
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
import { rm, writeFile } from "node:fs/promises";
import { getDb } from "@/lib/db";
import { MAX_FOTOS_PRODUTO } from "@/lib/comprovante-limites";
import { checarRateLimit } from "@/lib/rate-limit";
import {
  motoristaPodeAcessarEntrega,
  obterMotoristaAutorizado,
} from "@/lib/motorista-authorization";
import { confirmarEntrega, iniciarEntrega, iniciarRota } from "./actions";

const revalidatePathMock = vi.mocked(revalidatePath);
const writeFileMock = vi.mocked(writeFile);
const rmMock = vi.mocked(rm);
const getDbMock = vi.mocked(getDb);
const checarRateLimitMock = vi.mocked(checarRateLimit);
const motoristaPodeAcessarEntregaMock = vi.mocked(motoristaPodeAcessarEntrega);

const ENTREGA_ID = "11111111-1111-4111-8111-111111111111";
const ENTREGA_ID_2 = "22222222-2222-4222-8222-222222222222";
const ENTREGA_ID_3 = "33333333-3333-4333-8333-333333333333";

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
    transaction: vi.fn(async (callback: (trx: typeof tx) => Promise<boolean>) =>
      callback(tx),
    ),
  };

  getDbMock.mockReturnValue(
    db as unknown as NonNullable<ReturnType<typeof getDb>>,
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
  fotoProduto = false,
  fotosProduto = 0,
}: {
  comprovantePix?: boolean;
  fotoProduto?: boolean;
  fotosProduto?: number;
} = {}): FormData {
  const formData = new FormData();
  formData.set("recebedorNome", "Maria da Silva");
  formData.set("fotoEntrega", arquivoPng("entrega.png"));

  if (comprovantePix) {
    formData.set("comprovantePix", arquivoPng("comprovante-pix.png"));
  }

  if (fotoProduto) {
    formData.append("fotoProduto", arquivoPng("produto.png"));
  }

  for (let i = 1; i <= fotosProduto; i++) {
    formData.append("fotoProduto", arquivoPng(`produto-${i}.png`));
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
      confirmarEntrega("entrega-invalida", criarFormDataEntrega()),
    ).resolves.toEqual({
      ok: false,
      error: "Entrega inválida.",
    });

    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("exige o nome de quem recebeu antes de confirmar", async () => {
    const formData = criarFormDataEntrega();
    formData.delete("recebedorNome");

    const resultado = await confirmarEntrega(ENTREGA_ID, formData);

    expect(resultado).toEqual({
      ok: false,
      error: "Informe o nome de quem recebeu a mercadoria.",
    });
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("exige foto da entrega antes de confirmar", async () => {
    const formData = new FormData();
    formData.set("recebedorNome", "Maria da Silva");

    await expect(confirmarEntrega(ENTREGA_ID, formData)).resolves.toEqual({
      ok: false,
      error:
        "Tire uma foto válida da entrega (JPG, PNG, WEBP, HEIC ou HEIF, até 8 MB).",
    });

    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("confirma entrega não Pix só com a foto da entrega", async () => {
    const { db, tx, insertValues } = configurarDb({
      selectResultados: [
        [
          {
            id: ENTREGA_ID,
            numero: 123,
            clienteNome: "Cliente Teste",
            formaPagamento: "dinheiro",
          },
        ],
        [],
      ],
    });

    await expect(
      confirmarEntrega(ENTREGA_ID, criarFormDataEntrega()),
    ).resolves.toEqual({
      ok: true,
    });

    expect(tx.update).toHaveBeenCalledTimes(1);
    // Sem outra entrega em rota: a última posição do motorista é apagada.
    expect(db.delete).toHaveBeenCalledTimes(1);
    expect(writeFileMock).toHaveBeenCalledTimes(1);
    expect(writeFileMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "entregas/cliente-teste/entrega-000123".replaceAll("/", path.sep),
      ),
      expect.any(Uint8Array),
      { flag: "wx" },
    );

    expect(insertValues).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          entregaId: ENTREGA_ID,
          tipo: "foto",
          capturadoPorMotoboy: "motorista-a",
        }),
      ]),
    );
    expect(insertValues).not.toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ tipo: "assinatura_cliente" }),
      ]),
    );

    expect(insertValues).toHaveBeenCalledWith({
      entregaId: ENTREGA_ID,
      statusAnterior: "pendente",
      statusNovo: "entregue",
      alteradoPorMotoboy: "motorista-a",
      observacao:
        "Entrega confirmada com foto da entrega. Recebido por Maria da Silva.",
    });
  });

  it("conclui entrega Pix sem comprovante (o comprovante é opcional)", async () => {
    const { insertValues } = configurarDb({
      selectResultados: [
        [
          {
            id: ENTREGA_ID,
            numero: 123,
            clienteNome: "Cliente Teste",
            formaPagamento: "pix",
          },
        ],
        [],
      ],
    });

    await expect(
      confirmarEntrega(ENTREGA_ID, criarFormDataEntrega()),
    ).resolves.toEqual({ ok: true });

    expect(writeFileMock).toHaveBeenCalledTimes(1);
    expect(insertValues).toHaveBeenCalledWith({
      entregaId: ENTREGA_ID,
      statusAnterior: "pendente",
      statusNovo: "entregue",
      alteradoPorMotoboy: "motorista-a",
      observacao:
        "Entrega confirmada com foto da entrega. Recebido por Maria da Silva.",
    });
  });

  it("salva comprovante Pix separado quando o motorista envia", async () => {
    const { insertValues } = configurarDb({
      selectResultados: [
        [
          {
            id: ENTREGA_ID,
            numero: 123,
            clienteNome: "Cliente Teste",
            formaPagamento: "pix",
          },
        ],
        [],
      ],
    });

    await expect(
      confirmarEntrega(
        ENTREGA_ID,
        criarFormDataEntrega({ comprovantePix: true }),
      ),
    ).resolves.toEqual({
      ok: true,
    });

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
          tipo: "comprovante_pix",
          capturadoPorMotoboy: "motorista-a",
        }),
      ]),
    );

    expect(insertValues).toHaveBeenCalledWith({
      entregaId: ENTREGA_ID,
      statusAnterior: "pendente",
      statusNovo: "entregue",
      alteradoPorMotoboy: "motorista-a",
      observacao:
        "Entrega confirmada com foto da entrega e comprovante Pix. Recebido por Maria da Silva.",
    });
  });

  it("salva a foto do produto quando o motorista envia", async () => {
    const { insertValues } = configurarDb({
      selectResultados: [
        [
          {
            id: ENTREGA_ID,
            numero: 123,
            clienteNome: "Cliente Teste",
            formaPagamento: "dinheiro",
          },
        ],
        [],
      ],
    });

    await expect(
      confirmarEntrega(ENTREGA_ID, criarFormDataEntrega({ fotoProduto: true })),
    ).resolves.toEqual({ ok: true });

    expect(writeFileMock).toHaveBeenCalledTimes(2);
    expect(insertValues).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ tipo: "foto" }),
        expect.objectContaining({
          tipo: "foto_produto",
          capturadoPorMotoboy: "motorista-a",
        }),
      ]),
    );
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        observacao:
          "Entrega confirmada com foto da entrega e foto do produto. Recebido por Maria da Silva.",
      }),
    );
  });

  it("salva foto do produto e comprovante Pix juntos", async () => {
    const { insertValues } = configurarDb({
      selectResultados: [
        [
          {
            id: ENTREGA_ID,
            numero: 123,
            clienteNome: "Cliente Teste",
            formaPagamento: "pix",
          },
        ],
        [],
      ],
    });

    await expect(
      confirmarEntrega(
        ENTREGA_ID,
        criarFormDataEntrega({ comprovantePix: true, fotoProduto: true }),
      ),
    ).resolves.toEqual({ ok: true });

    expect(writeFileMock).toHaveBeenCalledTimes(3);
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        observacao:
          "Entrega confirmada com foto da entrega, comprovante Pix e foto do produto. Recebido por Maria da Silva.",
      }),
    );
  });

  it("salva várias fotos do produto", async () => {
    const { insertValues } = configurarDb({
      selectResultados: [
        [
          {
            id: ENTREGA_ID,
            numero: 123,
            clienteNome: "Cliente Teste",
            formaPagamento: "dinheiro",
          },
        ],
        [],
      ],
    });

    await expect(
      confirmarEntrega(ENTREGA_ID, criarFormDataEntrega({ fotosProduto: 3 })),
    ).resolves.toEqual({ ok: true });

    expect(writeFileMock).toHaveBeenCalledTimes(4);
    const anexos = insertValues.mock.calls
      .map((chamada) => chamada[0])
      .find(Array.isArray) as Array<{ tipo: string }>;
    expect(anexos.filter((item) => item.tipo === "foto_produto")).toHaveLength(
      3,
    );
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        observacao:
          "Entrega confirmada com foto da entrega e 3 fotos do produto. Recebido por Maria da Silva.",
      }),
    );
  });

  it("rejeita mais fotos do produto que o limite", async () => {
    await expect(
      confirmarEntrega(
        ENTREGA_ID,
        criarFormDataEntrega({ fotosProduto: MAX_FOTOS_PRODUTO + 1 }),
      ),
    ).resolves.toEqual({
      ok: false,
      error: `Envie no máximo ${MAX_FOTOS_PRODUTO} fotos do produto.`,
    });

    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("rejeita foto do produto inválida quando informada", async () => {
    const formData = criarFormDataEntrega();
    formData.append(
      "fotoProduto",
      new File(["nao-e-imagem"], "produto.txt", { type: "text/plain" }),
    );

    await expect(confirmarEntrega(ENTREGA_ID, formData)).resolves.toEqual({
      ok: false,
      error:
        "As fotos do produto devem ser imagens JPG, PNG, WEBP, HEIC ou HEIF com até 8 MB cada.",
    });

    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("rejeita comprovante Pix inválido quando informado", async () => {
    const formData = criarFormDataEntrega();
    formData.set(
      "comprovantePix",
      new File(["conteudo-invalido"], "comprovante.txt", {
        type: "text/plain",
      }),
    );

    await expect(confirmarEntrega(ENTREGA_ID, formData)).resolves.toEqual({
      ok: false,
      error:
        "O comprovante Pix deve ser uma imagem JPG, PNG, WEBP, HEIC ou HEIF com até 8 MB.",
    });

    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("reenvio de entrega já concluída pelo próprio motorista é sucesso e não grava nada", async () => {
    const { tx } = configurarDb({
      selectResultados: [[], [{ id: ENTREGA_ID }]],
    });

    await expect(
      confirmarEntrega(ENTREGA_ID, criarFormDataEntrega()),
    ).resolves.toEqual({ ok: true, jaConcluida: true });

    expect(writeFileMock).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("não confirma entrega que já não está disponível para conclusão", async () => {
    configurarDb({
      selectResultados: [[], []],
    });

    await expect(
      confirmarEntrega(ENTREGA_ID, criarFormDataEntrega()),
    ).resolves.toEqual({
      ok: false,
      error: "Entrega não encontrada, já concluída ou ainda não iniciada.",
    });

    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it("envio simultâneo: se outro envio concluiu primeiro, devolve sucesso e apaga os arquivos extras", async () => {
    configurarDb({
      selectResultados: [
        [
          {
            id: ENTREGA_ID,
            numero: 123,
            clienteNome: "Cliente Teste",
            formaPagamento: "dinheiro",
          },
        ],
        [{ id: ENTREGA_ID }],
      ],
      transacaoResultados: [[]],
    });

    await expect(
      confirmarEntrega(ENTREGA_ID, criarFormDataEntrega()),
    ).resolves.toEqual({ ok: true, jaConcluida: true });

    expect(rmMock).toHaveBeenCalled();
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
      selectResultados: [
        [
          {
            id: ENTREGA_ID,
            numero: 123,
            clienteNome: "Cliente Teste",
            formaPagamento: "dinheiro",
          },
        ],
        [],
      ],
    });

    await confirmarEntrega(ENTREGA_ID, criarFormDataEntrega());

    expect(revalidatePathMock).toHaveBeenCalledWith("/motorista");
    expect(revalidatePathMock).toHaveBeenCalledWith("/canhotos");
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
  });
  it("mantém a localização do motorista quando ainda há outra entrega em rota", async () => {
    const { db } = configurarDb({
      selectResultados: [
        [
          {
            id: ENTREGA_ID,
            numero: 123,
            clienteNome: "Cliente Teste",
            formaPagamento: "dinheiro",
          },
        ],
        [{ id: "outra-entrega" }],
      ],
    });

    await expect(
      confirmarEntrega(ENTREGA_ID, criarFormDataEntrega()),
    ).resolves.toEqual({ ok: true });

    expect(db.delete).not.toHaveBeenCalled();
  });
});

describe("iniciarRota", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checarRateLimitMock.mockResolvedValue({
      permitido: true,
    } as Awaited<ReturnType<typeof checarRateLimit>>);
    vi.mocked(obterMotoristaAutorizado).mockResolvedValue("motorista-a");
  });

  it("inicia as paradas de uma vez, na ordem escolhida", async () => {
    const { txUpdateQuery, tx } = configurarDb({
      transacaoResultados: [
        [{ id: ENTREGA_ID_2 }],
        [{ id: ENTREGA_ID }],
        [{ id: ENTREGA_ID_3 }],
      ],
    });

    await expect(
      iniciarRota([ENTREGA_ID_2, ENTREGA_ID, ENTREGA_ID_3]),
    ).resolves.toEqual({ ok: true });

    expect(tx.update).toHaveBeenCalledTimes(3);
    const gravados = txUpdateQuery.set.mock.calls.map((chamada) => chamada[0]);
    expect(gravados.map((g) => g.rotaOrdem)).toEqual([1, 2, 3]);
    expect(new Set(gravados.map((g) => g.rotaId)).size).toBe(1);
    expect(gravados[0].rotaId).toMatch(/^[0-9a-f-]{36}$/);
    expect(new Set(gravados.map((g) => g.horaSaida)).size).toBe(1);
    expect(revalidatePathMock).toHaveBeenCalledWith("/motorista");
  });

  it("recusa menos de duas entregas, repetidas ou com id inválido", async () => {
    configurarDb();

    for (const ids of [
      [ENTREGA_ID],
      [ENTREGA_ID, ENTREGA_ID],
      [ENTREGA_ID, "nao-e-uuid"],
    ]) {
      const resultado = await iniciarRota(ids);
      expect(resultado.ok).toBe(false);
      expect(resultado.error).toMatch(/Escolha de 2 a 10 entregas/);
    }
    expect(getDbMock).not.toHaveBeenCalled();
  });

  it("não inicia nada se uma das entregas não está mais disponível", async () => {
    const { tx } = configurarDb({
      transacaoResultados: [[{ id: ENTREGA_ID }], []],
    });

    const resultado = await iniciarRota([ENTREGA_ID, ENTREGA_ID_2]);

    expect(resultado.ok).toBe(false);
    expect(resultado.error).toMatch(/não está mais disponível/);
    // A transação foi interrompida por exceção, o que desfaz a primeira parada.
    expect(tx.update).toHaveBeenCalledTimes(2);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("exige sessão de motorista", async () => {
    vi.mocked(obterMotoristaAutorizado).mockResolvedValue(null);
    configurarDb();

    await expect(iniciarRota([ENTREGA_ID, ENTREGA_ID_2])).resolves.toEqual({
      ok: false,
      error: "Sessão expirada — faça login novamente.",
    });
  });
});
