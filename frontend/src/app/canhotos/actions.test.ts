import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/admin-auth", () => ({
  exigirAdminAutenticado: vi.fn(),
}));
vi.mock("@/lib/operador-auth", () => ({
  obterOperadorAutenticado: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  checarRateLimit: vi.fn(),
  RATE_LIMIT_ESTRITO: 3,
}));
vi.mock("@/lib/db/errors", () => ({
  mensagemErroBanco: vi.fn(() => "Erro de banco."),
}));

import { exigirAdminAutenticado } from "@/lib/admin-auth";
import { obterOperadorAutenticado } from "@/lib/operador-auth";
import { getDb } from "@/lib/db";
import { checarRateLimit } from "@/lib/rate-limit";
import { cancelarEntrega, excluirEntrega } from "./actions";

const exigirAdminAutenticadoMock = vi.mocked(exigirAdminAutenticado);
const getDbMock = vi.mocked(getDb);
const checarRateLimitMock = vi.mocked(checarRateLimit);

type EntregaAtual = {
  id: string;
  status: "pendente" | "entregue" | "cancelado";
  horaSaida: string | null;
  clienteAssinouEm: string | null;
  caixaConfirmouEm: string | null;
};

function selectQuery(resultado: unknown[]) {
  const query = {
    from: vi.fn(),
    where: vi.fn(),
    for: vi.fn(),
    limit: vi.fn().mockResolvedValue(resultado),
  };
  query.from.mockReturnValue(query);
  query.where.mockReturnValue(query);
  query.for.mockReturnValue(query);
  return query;
}

function configurarDb({
  atual,
  anexo = null,
  historico = null,
  excluida = true,
}: {
  atual: EntregaAtual | null;
  anexo?: { id: string } | null;
  historico?: { id: string } | null;
  excluida?: boolean;
}) {
  const selects = [
    selectQuery(atual ? [atual] : []),
    selectQuery(anexo ? [anexo] : []),
    selectQuery(historico ? [historico] : []),
  ];

  const deleteQuery = {
    where: vi.fn(),
    returning: vi.fn().mockResolvedValue(excluida ? [{ id: "entrega-1" }] : []),
  };
  deleteQuery.where.mockReturnValue(deleteQuery);

  const tx = {
    select: vi.fn(() => {
      const next = selects.shift();
      if (!next) throw new Error("select inesperado");
      return next;
    }),
    delete: vi.fn().mockReturnValue(deleteQuery),
  };

  const db = {
    transaction: vi.fn(
      async (callback: (trx: typeof tx) => Promise<unknown>) => callback(tx)
    ),
  };

  getDbMock.mockReturnValue(
    db as unknown as NonNullable<ReturnType<typeof getDb>>
  );

  return { tx, deleteQuery };
}

describe("exclusão administrativa de entrega", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exigirAdminAutenticadoMock.mockResolvedValue(true);
    checarRateLimitMock.mockResolvedValue({
      permitido: true,
      restante: 2,
    });
  });

  it("permite excluir somente cadastro pendente e ainda intocado", async () => {
    const { tx } = configurarDb({
      atual: {
        id: "entrega-1",
        status: "pendente",
        horaSaida: null,
        clienteAssinouEm: null,
        caixaConfirmouEm: null,
      },
    });

    await expect(excluirEntrega("entrega-1")).resolves.toEqual({ ok: true });
    expect(tx.delete).toHaveBeenCalledTimes(1);
  });

  it("preserva entrega que já foi iniciada", async () => {
    const { tx } = configurarDb({
      atual: {
        id: "entrega-1",
        status: "pendente",
        horaSaida: "10:30:00",
        clienteAssinouEm: null,
        caixaConfirmouEm: null,
      },
    });

    await expect(excluirEntrega("entrega-1")).resolves.toEqual({
      ok: false,
      error:
        "Esta entrega já entrou no fluxo operacional e deve ser preservada. Use cancelamento quando aplicável.",
    });
    expect(tx.delete).not.toHaveBeenCalled();
  });

  it("preserva entrega com histórico ou comprovante", async () => {
    const { tx } = configurarDb({
      atual: {
        id: "entrega-1",
        status: "pendente",
        horaSaida: null,
        clienteAssinouEm: null,
        caixaConfirmouEm: null,
      },
      historico: { id: "historico-1" },
    });

    await expect(excluirEntrega("entrega-1")).resolves.toEqual({
      ok: false,
      error:
        "Esta entrega possui comprovantes ou histórico e não pode ser excluída.",
    });
    expect(tx.delete).not.toHaveBeenCalled();
  });

  it("preserva entrega já concluída", async () => {
    const { tx } = configurarDb({
      atual: {
        id: "entrega-1",
        status: "entregue",
        horaSaida: "10:30:00",
        clienteAssinouEm: "2026-09-20T13:00:00.000Z",
        caixaConfirmouEm: null,
      },
    });

    const resultado = await excluirEntrega("entrega-1");

    expect(resultado.ok).toBe(false);
    expect(tx.delete).not.toHaveBeenCalled();
  });
});


describe("cancelamento de entrega com motivo", () => {
  const operadorMock = vi.mocked(obterOperadorAutenticado);

  function configurarCancelamento(
    atual: { status: string; setorId: string | null; motoboyId: string | null } | null
  ) {
    const updateQuery = { set: vi.fn(), where: vi.fn().mockResolvedValue(undefined) };
    updateQuery.set.mockReturnValue(updateQuery);
    const insertValues = vi.fn().mockResolvedValue(undefined);
    const tx = {
      select: vi.fn(() => selectQuery(atual ? [atual] : [])),
      update: vi.fn().mockReturnValue(updateQuery),
      insert: vi.fn().mockReturnValue({ values: insertValues }),
    };
    const outraEmRota = selectQuery([]);
    const deleteWhere = vi.fn().mockResolvedValue(undefined);
    const db = {
      transaction: vi.fn(
        async (callback: (trx: typeof tx) => Promise<unknown>) => callback(tx)
      ),
      select: vi.fn(() => outraEmRota),
      delete: vi.fn().mockReturnValue({ where: deleteWhere }),
    };
    getDbMock.mockReturnValue(db as unknown as NonNullable<ReturnType<typeof getDb>>);
    return { tx, insertValues, db };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    operadorMock.mockResolvedValue({
      tipo: "admin",
      usuarioAdminId: "admin-1",
      colaboradorId: null,
      setorId: null,
    });
    checarRateLimitMock.mockResolvedValue({ permitido: true, restante: 2 });
  });

  it("exige motivo", async () => {
    await expect(cancelarEntrega("entrega-1", "  ")).resolves.toEqual({
      ok: false,
      error: "Informe o motivo do cancelamento.",
    });
  });

  it("cancela pendente e grava o motivo no histórico", async () => {
    const { insertValues, db } = configurarCancelamento({
      status: "pendente",
      setorId: null,
      motoboyId: "moto-1",
    });

    await expect(
      cancelarEntrega("entrega-1", "Cliente desistiu")
    ).resolves.toEqual({ ok: true });
    expect(insertValues).toHaveBeenCalledWith({
      entregaId: "entrega-1",
      statusAnterior: "pendente",
      statusNovo: "cancelado",
      alteradoPor: null,
      alteradoPorAdmin: "admin-1",
      observacao: "Motivo do cancelamento: Cliente desistiu",
    });
    // Sem outra entrega em rota: a posição do motorista é apagada.
    expect(db.delete).toHaveBeenCalledTimes(1);
  });

  it("não cancela entrega concluída", async () => {
    const { tx } = configurarCancelamento({
      status: "entregue",
      setorId: null,
      motoboyId: null,
    });
    const resultado = await cancelarEntrega("entrega-1", "engano");
    expect(resultado.ok).toBe(false);
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("gestor de setor cancela entrega de outro setor, como o admin", async () => {
    operadorMock.mockResolvedValue({
      tipo: "gestor_setor",
      colaboradorId: "colab-1",
      setorId: "setor-a",
    });
    const { tx } = configurarCancelamento({
      status: "pendente",
      setorId: "setor-b",
      motoboyId: null,
    });
    await expect(cancelarEntrega("entrega-1", "motivo qualquer")).resolves.toEqual({
      ok: true,
    });
    expect(tx.update).toHaveBeenCalled();
  });
});
