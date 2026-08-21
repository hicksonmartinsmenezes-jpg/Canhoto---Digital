"use server";

// Server Action de login do app do motorista (Issue #5, sub-issue #29) —
// telefone + PIN de 4 dígitos, sem Supabase Auth (ver decisão de
// 21/08/2026 em claude/ideias-decisoes-projeto.md). Mensagem de erro
// genérica de propósito (telefone não encontrado, motorista inativo, sem
// PIN gerado e PIN errado devolvem o mesmo texto) — não dá pra descobrir
// por tentativa e erro quais telefones existem no sistema.

import { redirect } from "next/navigation";
import { checarRateLimit, RATE_LIMIT_ESTRITO } from "@/lib/rate-limit";
import { getMotoboyPorTelefone } from "@/lib/data/motoboys";
import { normalizarTelefone, verificarPin } from "@/lib/motorista-auth";
import { definirCookieSessaoMotorista } from "@/lib/motorista-session";

export interface LoginMotoristaResult {
  ok: boolean;
  error?: string;
}

const MENSAGEM_INVALIDA = "Telefone ou PIN inválido.";

export async function loginMotorista(
  telefoneRaw: string,
  pin: string
): Promise<LoginMotoristaResult> {
  // Limite mais estrito que o padrão (5/min em vez de 10/min) — é a única
  // porta de entrada do sistema hoje alcançável sem já estar logado, e o
  // PIN é curto (4 dígitos), então vale frear tentativa por força bruta
  // mais agressivamente que nas Server Actions internas do admin.
  const limite = await checarRateLimit("loginMotorista", RATE_LIMIT_ESTRITO);
  if (!limite.permitido) {
    return {
      ok: false,
      error: "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  const telefone = normalizarTelefone(telefoneRaw);
  if (!telefone) {
    return { ok: false, error: "Informe o telefone cadastrado." };
  }
  if (!/^\d{4}$/.test(pin)) {
    return { ok: false, error: "Informe o PIN de 4 dígitos." };
  }

  const motoboy = await getMotoboyPorTelefone(telefone);
  if (!motoboy || !motoboy.ativo || !motoboy.pinHash) {
    return { ok: false, error: MENSAGEM_INVALIDA };
  }
  if (!verificarPin(pin, motoboy.pinHash)) {
    return { ok: false, error: MENSAGEM_INVALIDA };
  }

  const sessaoCriada = await definirCookieSessaoMotorista(motoboy.id);
  if (!sessaoCriada) {
    return {
      ok: false,
      error:
        "Login do motorista ainda não está configurado neste ambiente — confirme o MOTORISTA_SESSION_SECRET no .env.local.",
    };
  }

  redirect("/motorista");
}
