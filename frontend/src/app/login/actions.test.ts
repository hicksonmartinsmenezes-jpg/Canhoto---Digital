import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ getDb: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  checarRateLimit: vi.fn(),
  contaBloqueadaPorFalhas: vi.fn(),
  limparFalhasLogin: vi.fn(),
  registrarFalhaLogin: vi.fn(),
  RATE_LIMIT_ESTRITO: 5,
}));
vi.mock("@/lib/admin-session", () => ({
  definirCookieSessaoAdmin: vi.fn(),
  encerrarSessaoAdmin: vi.fn(),
}));
vi.mock("@/lib/colaborador-session", () => ({
  definirCookieSessaoColaborador: vi.fn(),
  encerrarSessaoColaborador: vi.fn(),
}));

import { getDb } from "@/lib/db";
import { colaboradores, usuariosAdmin } from "@/lib/db/schema";
import {
  checarRateLimit,
  contaBloqueadaPorFalhas,
  registrarFalhaLogin,
} from "@/lib/rate-limit";
import {
  definirCookieSessaoAdmin,
  encerrarSessaoAdmin,
} from "@/lib/admin-session";
import {
  definirCookieSessaoColaborador,
  encerrarSessaoColaborador,
} from "@/lib/colaborador-session";
import { entrar } from "./actions";

const SENHA = "senha-correta";
const HASH = bcrypt.hashSync(SENHA, 4);

type LinhaAdmin = { id: string; senhaHash: string };
type LinhaColaborador = {
  id: string;
  senhaHash: string | null;
  setorId: string | null;
  papel: "admin" | "gestor_setor" | "colaborador";
};

// O login consulta administrador e colaborador sempre juntos: o mock devolve
// cada resultado conforme a tabela recebida em .from().
function configurarDb({
  admin = [],
  colaborador = [],
}: {
  admin?: LinhaAdmin[];
  colaborador?: LinhaColaborador[];
}) {
  const db = {
    select: vi.fn(() => ({
      from: (tabela: unknown) => {
        const resultado = tabela === usuariosAdmin ? admin : colaborador;
        const consulta = {
          where: () => consulta,
          limit: async () => resultado,
        };
        return consulta;
      },
    })),
  };
  vi.mocked(getDb).mockReturnValue(
    db as unknown as NonNullable<ReturnType<typeof getDb>>
  );
  expect(colaboradores).toBeDefined();
}

describe("login único por usuário e senha", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checarRateLimit).mockResolvedValue({ permitido: true, restante: 4 });
    vi.mocked(contaBloqueadaPorFalhas).mockReturnValue(false);
    vi.mocked(definirCookieSessaoAdmin).mockResolvedValue(true);
    vi.mocked(definirCookieSessaoColaborador).mockResolvedValue(true);
  });

  it("exige usuário e senha", async () => {
    configurarDb({});

    expect(await entrar("  ", SENHA)).toEqual({
      ok: false,
      error: "Informe seu usuário.",
    });
    expect(await entrar("ana", "")).toEqual({
      ok: false,
      error: "Informe sua senha.",
    });
  });

  it("entra como administrador e encerra a sessão de colaborador", async () => {
    configurarDb({ admin: [{ id: "admin-1", senhaHash: HASH }] });

    const resultado = await entrar("Admin@Rildon.com", SENHA);

    expect(resultado).toEqual({ ok: true });
    expect(definirCookieSessaoAdmin).toHaveBeenCalledWith("admin-1");
    expect(encerrarSessaoColaborador).toHaveBeenCalled();
    expect(definirCookieSessaoColaborador).not.toHaveBeenCalled();
  });

  it("entra como colaborador gestor de setor e encerra a sessão de admin", async () => {
    configurarDb({
      colaborador: [
        { id: "colab-1", senhaHash: HASH, setorId: "setor-1", papel: "gestor_setor" },
      ],
    });

    const resultado = await entrar("ana.silva", SENHA);

    expect(resultado).toEqual({ ok: true });
    expect(definirCookieSessaoColaborador).toHaveBeenCalledWith("colab-1", "setor-1");
    expect(encerrarSessaoAdmin).toHaveBeenCalled();
    expect(definirCookieSessaoAdmin).not.toHaveBeenCalled();
  });

  it("recusa senha errada e registra a falha", async () => {
    configurarDb({
      colaborador: [
        { id: "colab-1", senhaHash: HASH, setorId: "setor-1", papel: "gestor_setor" },
      ],
    });

    const resultado = await entrar("ana.silva", "outra-senha");

    expect(resultado).toEqual({ ok: false, error: "Usuário ou senha inválidos." });
    expect(registrarFalhaLogin).toHaveBeenCalledWith("entrarAdmin", "ana.silva");
    expect(definirCookieSessaoColaborador).not.toHaveBeenCalled();
  });

  it("recusa usuário que não existe", async () => {
    configurarDb({});

    const resultado = await entrar("ninguem", SENHA);

    expect(resultado).toEqual({ ok: false, error: "Usuário ou senha inválidos." });
    expect(registrarFalhaLogin).toHaveBeenCalled();
  });

  it("recusa colaborador sem senha definida", async () => {
    configurarDb({
      colaborador: [
        { id: "colab-1", senhaHash: null, setorId: "setor-1", papel: "gestor_setor" },
      ],
    });

    const resultado = await entrar("ana.silva", SENHA);

    expect(resultado.ok).toBe(false);
    expect(definirCookieSessaoColaborador).not.toHaveBeenCalled();
  });

  it("recusa colaborador que não é gestor de setor", async () => {
    configurarDb({
      colaborador: [
        { id: "colab-1", senhaHash: HASH, setorId: "setor-1", papel: "colaborador" },
      ],
    });

    const resultado = await entrar("ana.silva", SENHA);

    expect(resultado.ok).toBe(false);
    expect(definirCookieSessaoColaborador).not.toHaveBeenCalled();
  });

  it("bloqueia a conta depois de muitas falhas", async () => {
    configurarDb({ admin: [{ id: "admin-1", senhaHash: HASH }] });
    vi.mocked(contaBloqueadaPorFalhas).mockReturnValue(true);

    const resultado = await entrar("admin@rildon.com", SENHA);

    expect(resultado.ok).toBe(false);
    expect(resultado.error).toContain("Muitas tentativas para esta conta");
    expect(definirCookieSessaoAdmin).not.toHaveBeenCalled();
  });
});
