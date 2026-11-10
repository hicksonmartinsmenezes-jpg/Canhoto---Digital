import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ exigirAdminAutenticado: vi.fn() }));
vi.mock("@/lib/db", () => ({ getDb: vi.fn() }));
vi.mock("@/lib/db/errors", () => ({
  codigoErroPostgres: vi.fn((erro: { code?: string }) => erro.code),
  mensagemErroBanco: vi.fn(() => "Erro de banco."),
}));
vi.mock("@/lib/rate-limit", () => ({
  checarRateLimit: vi.fn(),
  RATE_LIMIT_ESTRITO: 5,
}));

import { exigirAdminAutenticado } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { colaboradores, setores } from "@/lib/db/schema";
import { checarRateLimit } from "@/lib/rate-limit";
import { atualizarColaborador, criarColaborador } from "./actions";

type ColaboradorAtual = { nome: string; usuario: string | null };

function configurarDb({
  atual = { nome: "ana", usuario: "ana" },
  erroInsert,
}: { atual?: ColaboradorAtual; erroInsert?: { code: string } } = {}) {
  const insertValues = vi.fn(async () => {
    if (erroInsert) throw erroInsert;
  });
  const updateSet = vi.fn();
  const updateQuery = {
    set: updateSet,
    where: vi.fn(),
    returning: vi.fn().mockResolvedValue([{ id: "colab-1" }]),
  };
  updateSet.mockReturnValue(updateQuery);
  updateQuery.where.mockReturnValue(updateQuery);

  const db = {
    select: vi.fn(() => ({
      from: (tabela: unknown) => {
        const resultado =
          tabela === setores ? [{ id: "setor-1" }] : [atual];
        const consulta = {
          where: () => consulta,
          limit: async () => resultado,
        };
        return consulta;
      },
    })),
    insert: vi.fn(() => ({ values: insertValues })),
    update: vi.fn(() => updateQuery),
  };
  vi.mocked(getDb).mockReturnValue(
    db as unknown as NonNullable<ReturnType<typeof getDb>>
  );
  expect(colaboradores).toBeDefined();
  return { insertValues, updateSet };
}

const dadosBase = {
  usuario: "ana.silva",
  papel: "gestor_setor" as const,
  ativo: true,
  senha: "1234",
};

describe("cadastro de colaborador por usuário e senha", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(exigirAdminAutenticado).mockResolvedValue(true as never);
    vi.mocked(checarRateLimit).mockResolvedValue({ permitido: true, restante: 9 });
  });

  it("cria o colaborador só com usuário e senha, usando o usuário como nome", async () => {
    const { insertValues } = configurarDb();

    const resultado = await criarColaborador({ ...dadosBase, usuario: "  Ana.Silva " });

    expect(resultado).toEqual({ ok: true });
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: "ana.silva",
        usuario: "ana.silva",
        papel: "gestor_setor",
        setorId: "setor-1",
        senhaHash: expect.stringMatching(/^\$2[aby]\$/),
      })
    );
  });

  it("exige usuário, formato válido e senha", async () => {
    const { insertValues } = configurarDb();

    expect(await criarColaborador({ ...dadosBase, usuario: " " })).toEqual({
      ok: false,
      error: "Informe o usuário.",
    });
    expect((await criarColaborador({ ...dadosBase, usuario: "ana silva" })).ok).toBe(false);
    expect((await criarColaborador({ ...dadosBase, usuario: "ab" })).ok).toBe(false);
    expect((await criarColaborador({ ...dadosBase, usuario: "ana@rildon.com" })).ok).toBe(false);
    expect(await criarColaborador({ ...dadosBase, senha: "" })).toEqual({
      ok: false,
      error: "Defina uma senha.",
    });
    expect(await criarColaborador({ ...dadosBase, senha: "123" })).toEqual({
      ok: false,
      error: "A senha deve ter pelo menos 4 caracteres.",
    });
    expect(insertValues).not.toHaveBeenCalled();
  });

  it("avisa quando o usuário já está em uso", async () => {
    configurarDb({ erroInsert: { code: "23505" } });

    expect(await criarColaborador(dadosBase)).toEqual({
      ok: false,
      error: "Esse usuário já está em uso.",
    });
  });

  it("exige sessão de administrador", async () => {
    configurarDb();
    vi.mocked(exigirAdminAutenticado).mockResolvedValue(false as never);

    expect((await criarColaborador(dadosBase)).ok).toBe(false);
  });

  it("ao editar, a troca de usuário leva o nome junto quando eram iguais", async () => {
    const { updateSet } = configurarDb({ atual: { nome: "ana", usuario: "ana" } });

    const resultado = await atualizarColaborador("colab-1", {
      ...dadosBase,
      usuario: "ana.nova",
      senha: "",
    });

    expect(resultado).toEqual({ ok: true });
    const gravado = updateSet.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(gravado).toMatchObject({ usuario: "ana.nova", nome: "ana.nova" });
    expect(gravado).not.toHaveProperty("senhaHash");
  });

  it("ao editar um cadastro antigo, mantém o nome real e só define o usuário", async () => {
    const { updateSet } = configurarDb({
      atual: { nome: "Ana da Silva", usuario: null },
    });

    await atualizarColaborador("colab-1", { ...dadosBase, senha: "" });

    const gravado = updateSet.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(gravado).toMatchObject({ usuario: "ana.silva" });
    expect(gravado).not.toHaveProperty("nome");
  });
});
