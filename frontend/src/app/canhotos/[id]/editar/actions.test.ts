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
vi.mock("@/lib/geocodificacao-gratis", () => ({
  geocodificarEntregaGratis: vi.fn().mockResolvedValue({
    latitude: -10.9472,
    longitude: -37.0731,
  }),
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

function configurarDb(
  statusAtual: "pendente" | "entregue" | "cancelado",
  {
    motoboyAtual = null,
    nomesMotoboys = [],
  }: {
    motoboyAtual?: string | null;
    nomesMotoboys?: Array<{ id: string; nome: string }>;
  } = {}
) {
  const dadosAtuaisQuery = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn().mockResolvedValue([
      {
        endereco: inputBase.endereco,
        cep: inputBase.cep,
        latitude: "-10.947200",
        longitude: "-37.073100",
        setorId: null,
        status: statusAtual,
      },
    ]),
  };
  dadosAtuaisQuery.from.mockReturnValue(dadosAtuaisQuery);
  dadosAtuaisQuery.where.mockReturnValue(dadosAtuaisQuery);

  const statusQuery = {
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn().mockResolvedValue([
      {
        status: statusAtual,
        data: inputBase.data,
        clienteNome: inputBase.clienteNome,
        valorPagamento: inputBase.valorPagamento.toFixed(2),
        formaPagamento: inputBase.formaPagamento,
        motoboyId: motoboyAtual,
      },
    ]),
  };
  statusQuery.from.mockReturnValue(statusQuery);
  statusQuery.where.mockReturnValue(statusQuery);

  const updateQuery = {
    set: vi.fn(),
    where: vi.fn(),
    returning: vi.fn().mockResolvedValue([{ id: "entrega-1" }]),
  };
  updateQuery.set.mockReturnValue(updateQuery);
  updateQuery.where.mockReturnValue(updateQuery);

  const insertValues = vi.fn().mockResolvedValue(undefined);

  // 2º select da transação (só quando o motorista muda): nomes.
  const nomesQuery = {
    from: vi.fn(),
    where: vi.fn().mockResolvedValue(nomesMotoboys),
  };
  nomesQuery.from.mockReturnValue(nomesQuery);

  const tx = {
    select: vi
      .fn()
      .mockReturnValueOnce(statusQuery)
      .mockReturnValue(nomesQuery),
    update: vi.fn().mockReturnValue(updateQuery),
    insert: vi.fn().mockReturnValue({ values: insertValues }),
  };

  const db = {
    select: vi.fn().mockReturnValue(dadosAtuaisQuery),
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
        "A entrega só pode ser concluída pelo fluxo do motorista com foto da entrega e assinatura.",
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
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        statusAnterior: "entregue",
        statusNovo: "entregue",
        observacao:
          "Dados alterados — Cliente: Cliente Teste → Cliente Atualizado.",
      })
    );
  });

  it("não grava histórico quando nada auditado muda", async () => {
    const { insertValues } = configurarDb("entregue");

    const resultado = await atualizarEntrega("entrega-1", {
      ...inputBase,
      status: "entregue",
      observacoes: "só uma observação",
    });

    expect(resultado).toEqual({ ok: true });
    expect(insertValues).not.toHaveBeenCalled();
  });

  it("registra valor, pagamento e motorista alterados numa entrega concluída", async () => {
    const { insertValues } = configurarDb("entregue", {
      motoboyAtual: "m1",
      nomesMotoboys: [
        { id: "m1", nome: "João" },
        { id: "m2", nome: "Pedro" },
      ],
    });

    const resultado = await atualizarEntrega("entrega-1", {
      ...inputBase,
      status: "entregue",
      valorPagamento: 120,
      formaPagamento: "dinheiro",
      motoboyId: "m2",
    });

    expect(resultado).toEqual({ ok: true });
    const registro = insertValues.mock.calls[0][0] as { observacao: string };
    expect(registro.observacao.replace(/\u00a0/g, " ")).toBe(
      "Dados alterados — Valor: R$ 100,00 → R$ 120,00; Pagamento: Pix → Dinheiro; Motorista: João → Pedro."
    );
  });

  it("gestor de setor não edita entrega concluída", async () => {
    const { db, tx } = configurarDb("entregue");
    // O setor da entrega precisa bater com o do gestor para chegar na regra.
    obterOperadorAutenticadoMock.mockResolvedValue({
      tipo: "gestor_setor",
      colaboradorId: "gestor-1",
      setorId: "setor-1",
    });
    db.select.mockReturnValue({
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              endereco: inputBase.endereco,
              cep: inputBase.cep,
              latitude: "-10.947200",
              longitude: "-37.073100",
              setorId: "setor-1",
              status: "entregue",
            },
          ],
        }),
      }),
    } as never);

    const resultado = await atualizarEntrega("entrega-1", {
      ...inputBase,
      status: "entregue",
      valorPagamento: 1,
    });

    expect(resultado).toEqual({
      ok: false,
      error: "Entrega já concluída: só o administrador pode alterar os dados.",
    });
    expect(tx.update).not.toHaveBeenCalled();
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
