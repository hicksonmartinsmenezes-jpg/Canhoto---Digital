import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  checarRateLimit: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));
vi.mock("@/lib/motorista-authorization", () => ({
  ERRO_MOTORISTA_SESSAO: "Sessão expirada — faça login novamente.",
  motoristaPodeAcessarEntrega: vi.fn(),
}));
vi.mock("@/lib/motorista-session", () => ({
  encerrarSessaoMotorista: vi.fn(),
}));
vi.mock("@/lib/erros-supabase", () => ({
  descreverErroSupabase: vi.fn((mensagem: string) => mensagem),
}));

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { checarRateLimit } from "@/lib/rate-limit";
import { motoristaPodeAcessarEntrega } from "@/lib/motorista-authorization";
import { confirmarEntrega, iniciarEntrega } from "./actions";

const revalidatePathMock = vi.mocked(revalidatePath);
const createAdminClientMock = vi.mocked(createAdminClient);
const checarRateLimitMock = vi.mocked(checarRateLimit);
const motoristaPodeAcessarEntregaMock = vi.mocked(
  motoristaPodeAcessarEntrega
);

function criarQuery(
  resultados: Array<{ data: { id: string } | null; error: null }> = [
    { data: { id: "entrega-1" }, error: null },
  ]
) {
  const query = {
    update: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    select: vi.fn(),
    maybeSingle: vi.fn(),
  };

  query.update.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.is.mockReturnValue(query);
  query.select.mockReturnValue(query);

  for (const resultado of resultados) {
    query.maybeSingle.mockResolvedValueOnce(resultado);
  }

  return query;
}

function configurarAcao({
  resultadosQuery,
  resultadosRpc = [{ data: "entrega-1", error: null }],
}: {
  resultadosQuery?: Array<{ data: { id: string } | null; error: null }>;
  resultadosRpc?: Array<{ data: string | null; error: null }>;
} = {}) {
  checarRateLimitMock.mockResolvedValue({
    permitido: true,
    restante: 9,
  });
  motoristaPodeAcessarEntregaMock.mockResolvedValue({
    motoboyId: "motorista-a",
  });

  const query = criarQuery(resultadosQuery);
  const from = vi.fn().mockReturnValue(query);
  const rpc = vi.fn();

  for (const resultado of resultadosRpc) {
    rpc.mockResolvedValueOnce(resultado);
  }

  createAdminClientMock.mockReturnValue({
    from,
    rpc,
  } as unknown as NonNullable<ReturnType<typeof createAdminClient>>);

  return { query, from, rpc };
}

describe("ações de entrega do motorista", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inicia somente entrega pendente, própria e ainda não iniciada", async () => {
    const { query } = configurarAcao();

    await expect(iniciarEntrega("entrega-1")).resolves.toEqual({ ok: true });

    expect(query.update).toHaveBeenCalledTimes(1);
    expect(query.update).toHaveBeenCalledWith({
      hora_saida: expect.any(String),
    });
    expect(query.eq).toHaveBeenCalledWith("id", "entrega-1");
    expect(query.eq).toHaveBeenCalledWith("motoboy_id", "motorista-a");
    expect(query.eq).toHaveBeenCalledWith("status", "pendente");
    expect(query.is).toHaveBeenCalledWith("hora_saida", null);
    expect(revalidatePathMock).toHaveBeenCalledWith("/motorista");
  });

  it("não inicia a mesma entrega duas vezes", async () => {
    configurarAcao({
      resultadosQuery: [
        { data: { id: "entrega-1" }, error: null },
        { data: null, error: null },
      ],
    });

    await expect(iniciarEntrega("entrega-1")).resolves.toEqual({ ok: true });
    await expect(iniciarEntrega("entrega-1")).resolves.toEqual({
      ok: false,
      error: "Entrega não encontrada ou já iniciada.",
    });
  });

  it("confirma somente entrega própria, pendente e previamente iniciada", async () => {
    const { rpc } = configurarAcao();

    await expect(confirmarEntrega("entrega-1")).resolves.toEqual({ ok: true });

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("confirmar_entrega_motorista", {
      p_entrega_id: "entrega-1",
      p_motoboy_id: "motorista-a",
      p_confirmado_em: expect.any(String),
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/motorista");
  });

  it("não confirma uma entrega que ainda não foi iniciada", async () => {
    configurarAcao({
      resultadosRpc: [{ data: null, error: null }],
    });

    await expect(confirmarEntrega("entrega-1")).resolves.toEqual({
      ok: false,
      error: "Entrega não encontrada ou ainda não iniciada.",
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("não confirma a mesma entrega duas vezes", async () => {
    configurarAcao({
      resultadosRpc: [
        { data: "entrega-1", error: null },
        { data: null, error: null },
      ],
    });

    await expect(confirmarEntrega("entrega-1")).resolves.toEqual({ ok: true });
    await expect(confirmarEntrega("entrega-1")).resolves.toEqual({
      ok: false,
      error: "Entrega não encontrada ou ainda não iniciada.",
    });
  });

  it("não toca no banco quando a entrega não pertence ao motorista", async () => {
    checarRateLimitMock.mockResolvedValue({
      permitido: true,
      restante: 9,
    });
    motoristaPodeAcessarEntregaMock.mockResolvedValue(null);

    await expect(iniciarEntrega("entrega-de-outro")).resolves.toEqual({
      ok: false,
      error: "Sessão expirada — faça login novamente.",
    });
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });
});
