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
import { getDb } from "@/lib/db";
import { checarRateLimit } from "@/lib/rate-limit";
import { conferirCaixa, excluirEntrega } from "./actions";
import { obterOperadorAutenticado } from "@/lib/operador-auth";

const exigirAdminAutenticadoMock = vi.mocked(exigirAdminAutenticado);
const getDbMock = vi.mocked(getDb);
const checarRateLimitMock = vi.mocked(checarRateLimit);
const obterOperadorAutenticadoMock = vi.mocked(obterOperadorAutenticado);

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


describe("conferência de caixa", () => {
  function configurarConferencia({
    atualizada,
    atual,
  }: {
    atualizada: boolean;
    atual?: { status: string; caixaConfirmouEm: string | null } | null;
  }) {
    // 1º select: colaborador que conferiu; depois update; depois (se não
    // atualizou) select do estado atual da entrega.
    const selects = [
      selectQuery([{ id: "colab-1" }]),
      selectQuery(atual ? [atual] : []),
    ];
    const updateQuery = {
      set: vi.fn(),
      where: vi.fn(),
      returning: vi
        .fn()
        .mockResolvedValue(atualizada ? [{ id: "entrega-1" }] : []),
    };
    updateQuery.set.mockReturnValue(updateQuery);
    updateQuery.where.mockReturnValue(updateQuery);

    const db = {
      select: vi.fn(() => {
        const next = selects.shift();
        if (!next) throw new Error("select inesperado");
        return next;
      }),
      update: vi.fn().mockReturnValue(updateQuery),
    };
    getDbMock.mockReturnValue(
      db as unknown as NonNullable<ReturnType<typeof getDb>>
    );
    return { db, updateQuery };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    checarRateLimitMock.mockResolvedValue({ permitido: true, restante: 5 });
    obterOperadorAutenticadoMock.mockResolvedValue({
      tipo: "admin",
      usuarioAdminId: "admin-1",
      colaboradorId: null,
      setorId: null,
    });
  });

  it("confere o caixa de uma entrega concluída", async () => {
    const { updateQuery } = configurarConferencia({ atualizada: true });
    await expect(conferirCaixa("entrega-1", "colab-1")).resolves.toEqual({
      ok: true,
    });
    expect(updateQuery.where).toHaveBeenCalledTimes(1);
  });

  it("recusa conferir entrega que ainda não foi concluída", async () => {
    configurarConferencia({
      atualizada: false,
      atual: { status: "pendente", caixaConfirmouEm: null },
    });
    await expect(conferirCaixa("entrega-1", "colab-1")).resolves.toEqual({
      ok: false,
      error: "Só é possível conferir o caixa de uma entrega já concluída.",
    });
  });

  it("avisa quando já foi conferida", async () => {
    configurarConferencia({
      atualizada: false,
      atual: { status: "entregue", caixaConfirmouEm: "2026-10-05T10:00:00Z" },
    });
    await expect(conferirCaixa("entrega-1", "colab-1")).resolves.toEqual({
      ok: false,
      error: "Essa entrega já foi conferida por outra pessoa.",
    });
  });

  it("não encontra entrega de outro setor para gestor_setor", async () => {
    obterOperadorAutenticadoMock.mockResolvedValue({
      tipo: "gestor_setor",
      colaboradorId: "gestor-1",
      setorId: "setor-1",
    });
    configurarConferencia({ atualizada: false, atual: null });
    await expect(conferirCaixa("entrega-1", "colab-1")).resolves.toEqual({
      ok: false,
      error: "Entrega não encontrada.",
    });
  });

  it("nega gestor_setor sem setor", async () => {
    obterOperadorAutenticadoMock.mockResolvedValue({
      tipo: "gestor_setor",
      colaboradorId: "gestor-1",
      setorId: null,
    });
    configurarConferencia({ atualizada: true });
    await expect(conferirCaixa("entrega-1", "colab-1")).resolves.toEqual({
      ok: false,
      error: "Entrega não encontrada.",
    });
  });
});
