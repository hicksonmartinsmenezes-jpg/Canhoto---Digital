import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/admin-auth", () => ({
  obterAdminAutenticado: vi.fn(),
}));
vi.mock("@/lib/rate-limit", () => ({
  checarRateLimit: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));
vi.mock("@/lib/erros-supabase", () => ({
  descreverErroSupabase: vi.fn((mensagem: string) => mensagem),
}));

import { revalidatePath } from "next/cache";
import { obterAdminAutenticado } from "@/lib/admin-auth";
import { checarRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { atualizarEntrega, type AtualizarEntregaInput } from "./actions";

const revalidatePathMock = vi.mocked(revalidatePath);
const obterAdminAutenticadoMock = vi.mocked(obterAdminAutenticado);
const checarRateLimitMock = vi.mocked(checarRateLimit);
const createAdminClientMock = vi.mocked(createAdminClient);

const input: AtualizarEntregaInput = {
  data: "2026-09-19",
  clienteNome: "Cliente Teste",
  clienteTelefone: "(79) 99999-9999",
  endereco: "Rua A, 123",
  numeroPedido: "PED-1",
  numeroNfe: "NFE-1",
  valorPagamento: 150,
  formaPagamento: "pix",
  motoboyId: "motoboy-1",
  observacoes: "Observação",
  status: "cancelado",
};

describe("edição administrativa da entrega", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checarRateLimitMock.mockResolvedValue({ permitido: true, restante: 9 });
  });

  it("recusa chamada sem sessão administrativa válida", async () => {
    obterAdminAutenticadoMock.mockResolvedValue(null);

    await expect(atualizarEntrega("entrega-1", input)).resolves.toEqual({
      ok: false,
      error: "Sessão administrativa inválida ou expirada.",
    });
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });

  it("envia à RPC a identidade derivada da sessão do admin", async () => {
    obterAdminAutenticadoMock.mockResolvedValue({
      authUserId: "auth-user-1",
      colaboradorId: "colaborador-1",
    });

    const rpc = vi.fn().mockResolvedValue({
      data: "entrega-1",
      error: null,
    });

    createAdminClientMock.mockReturnValue({
      rpc,
    } as unknown as NonNullable<ReturnType<typeof createAdminClient>>);

    await expect(atualizarEntrega("entrega-1", input)).resolves.toEqual({
      ok: true,
    });

    expect(rpc).toHaveBeenCalledWith("atualizar_entrega_admin", {
      p_entrega_id: "entrega-1",
      p_data: "2026-09-19",
      p_cliente_nome: "Cliente Teste",
      p_cliente_telefone: "(79) 99999-9999",
      p_endereco: "Rua A, 123",
      p_numero_pedido: "PED-1",
      p_numero_nfe: "NFE-1",
      p_valor_pagamento: 150,
      p_forma_pagamento: "pix",
      p_motoboy_id: "motoboy-1",
      p_observacoes: "Observação",
      p_status: "cancelado",
      p_auth_user_id: "auth-user-1",
      p_colaborador_id: "colaborador-1",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/canhotos");
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
  });

  it("preserva o auth user mesmo quando não há colaborador vinculado", async () => {
    obterAdminAutenticadoMock.mockResolvedValue({
      authUserId: "auth-user-1",
      colaboradorId: null,
    });

    const rpc = vi.fn().mockResolvedValue({
      data: "entrega-1",
      error: null,
    });

    createAdminClientMock.mockReturnValue({
      rpc,
    } as unknown as NonNullable<ReturnType<typeof createAdminClient>>);

    await atualizarEntrega("entrega-1", input);

    expect(rpc).toHaveBeenCalledWith(
      "atualizar_entrega_admin",
      expect.objectContaining({
        p_auth_user_id: "auth-user-1",
        p_colaborador_id: null,
      })
    );
  });
});
