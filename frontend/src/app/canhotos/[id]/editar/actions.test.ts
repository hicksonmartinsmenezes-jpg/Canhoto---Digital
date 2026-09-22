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
vi.mock("@/lib/db/errors", () => ({
  mensagemErroBanco: vi.fn(() => "Erro de banco."),
}));
vi.mock("@/lib/geocoding", () => ({
  geocodificarEnderecoEntrega: vi.fn().mockResolvedValue(null),
}));

import { getDb } from "@/lib/db";
import { obterOperadorAutenticado } from "@/lib/operador-auth";
import { checarRateLimit } from "@/lib/rate-limit";
import { atualizarEntrega, type AtualizarEntregaInput } from "./actions";

const getDbMock = vi.mocked(getDb);
const obterOperadorAutenticadoMock = vi.mocked(obterOperadorAutenticado);
const checarRateLimitMock = vi.mocked(checarRateLimit);

const inputBase: AtualizarEntregaInput = {
  data: "2026-09-20",
  clienteNome: "Cliente Teste",
  clienteTelefone: "",
  endereco: "Rua Teste",
  cep: "49000000",
  numeroPedido: "123",
  numeroNfe: "456",
  valorPagamento: 100,
  formaPagamento: "pix",
  motoboyId: "",
  observacoes: "",
  status: "pendente",
};

function configurarDb(statusAtual: "pendente" | "entregue" | "cancelado") {
  const enderecoQuery = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn().mockResolvedValue([
      {
        endereco: inputBase.endereco,
        cep: inputBase.cep,
        latitude: "-10.000000",
        longitude: "-37.000000",
      },
    ]),
  };
  enderecoQuery.from.mockReturnValue(enderecoQuery);
  enderecoQuery.where.mockReturnValue(enderecoQuery);

  const selectQuery = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn().mockResolvedValue([{ status: statusAtual }]),
  };
  selectQuery.from.mockReturnValue(selectQuery);
  selectQuery.where.mockReturnValue(selectQuery);

  const updateQuery = {
    set: vi.fn(),
    where: vi.fn(),
    returning: vi.fn().mockResolvedValue([{ id: "entrega-1" }]),
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
    select: vi.fn().mockReturnValue(enderecoQuery),
    transaction: vi.fn(
      async (callback: (trx: typeof tx) => Promise<unknown>) => callback(tx)
    ),
  };

  getDbMock.mockReturnValue(
    db as unknown as NonNullable<ReturnType<typeof getDb>>
  );

  return { db, tx, updateQuery, insertValues };
}

describe("edição administrativa de entrega", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    obterOperadorAutenticadoMock.mockResolvedValue({
      tipo: "admin",
      usuarioAdminId: "admin-1",
      colaboradorId: null,
      setorId: null,
    });
    checarRateLimitMock.mockResolvedValue({
      permitido: true,
      restante: 9,
    });
  });

  it("bloqueia mudança manual de pendente para entregue", async () => {
    const { tx } = configurarDb("pendente");

    const resultado = await atualizarEntrega("entrega-1", {
      ...inputBase,
      status: "entregue",
    });

    expect(resultado).toEqual({
      ok: false,
      error:
        "A entrega só pode ser concluída pelo fluxo do motorista com foto e assinatura.",
    });
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("bloqueia regressão de uma entrega já concluída", async () => {
    const { tx } = configurarDb("entregue");

    const resultado = await atualizarEntrega("entrega-1", {
      ...inputBase,
      status: "pendente",
    });

    expect(resultado).toEqual({
      ok: false,
      error:
        "Uma entrega concluída com comprovante não pode voltar para outro status.",
    });
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("permite editar dados de uma entrega que já está entregue mantendo o status", async () => {
    const { tx, insertValues } = configurarDb("entregue");

    const resultado = await atualizarEntrega("entrega-1", {
      ...inputBase,
      status: "entregue",
      clienteNome: "Cliente Atualizado",
    });

    expect(resultado).toEqual({ ok: true });
    expect(tx.update).toHaveBeenCalledTimes(1);
    expect(insertValues).not.toHaveBeenCalled();
  });

  it("permite cancelar uma entrega pendente e registra histórico", async () => {
    const { tx, insertValues } = configurarDb("pendente");

    const resultado = await atualizarEntrega("entrega-1", {
      ...inputBase,
      status: "cancelado",
    });

    expect(resultado).toEqual({ ok: true });
    expect(tx.update).toHaveBeenCalledTimes(1);
    expect(insertValues).toHaveBeenCalledWith({
      entregaId: "entrega-1",
      statusAnterior: "pendente",
      statusNovo: "cancelado",
      alteradoPor: null,
      alteradoPorAdmin: "admin-1",
    });
  });
});
