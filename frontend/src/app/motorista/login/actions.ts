"use server";

// Server Action de login do app do motorista (Issue #5, sub-issue #29) —
// telefone + PIN de 4 dígitos, sem Supabase Auth (ver decisão de
// 21/08/2026 em claude/ideias-decisoes-projeto.md). Mensagem de erro
// genérica de propósito (telefone não encontrado, motorista inativo, sem
// PIN gerado e PIN errado devolvem o mesmo texto) — não dá pra descobrir
// por tentativa e erro quais telefones existem no sistema.

import { redirect } from "next/navigation";
import { checarRateLimit, RATE_LIMIT_ESTRITO } from "@/lib/rate-limit";
import {
  limparTentativasLogin,
  reservarTentativaLogin,
} from "@/lib/login-rate-limit";
import { getMotoboyPorTelefone } from "@/lib/data/motoboys";
import { hashPin, normalizarTelefone, verificarPin } from "@/lib/motorista-auth";
import { definirCookieSessaoMotorista } from "@/lib/motorista-session";

export interface LoginMotoristaResult {
  ok: boolean;
  error?: string;
}

const MENSAGEM_INVALIDA = "Telefone ou PIN inválido.";
const MENSAGEM_CONTA_BLOQUEADA =
  "Muitas tentativas para este telefone — aguarde alguns minutos e tente de novo.";

// Hash fictício (scrypt do PIN "0000") só para gastar o mesmo tempo de CPU
// quando o telefone não existe/está inativo — sem isso, a resposta mais
// rápida revela quais telefones estão cadastrados.
const HASH_FICTICIO = hashPin("0000");

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

  let tentativaPermitida: boolean;
  try {
    tentativaPermitida = await reservarTentativaLogin(
      "loginMotorista",
      telefone
    );
  } catch {
    return {
      ok: false,
      error: "Serviço de autenticação temporariamente indisponível. Tente novamente.",
    };
  }
  if (!tentativaPermitida) {
    return { ok: false, error: MENSAGEM_CONTA_BLOQUEADA };
  }

  const motoboy = await getMotoboyPorTelefone(telefone);
  const hashParaComparar =
    motoboy && motoboy.ativo && motoboy.pinHash
      ? motoboy.pinHash
      : HASH_FICTICIO;
  const pinConfere = verificarPin(pin, hashParaComparar);
  if (!motoboy || !motoboy.ativo || !motoboy.pinHash || !pinConfere) {
    return { ok: false, error: MENSAGEM_INVALIDA };
  }

  try {
    await limparTentativasLogin("loginMotorista", telefone);
  } catch {
    return {
      ok: false,
      error: "Serviço de autenticação temporariamente indisponível. Tente novamente.",
    };
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
