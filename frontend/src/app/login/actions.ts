"use server";

// Server Action de login do Portal Web Admin (Issue #48) — link de acesso
// por e-mail (Supabase Auth "Magic Link"), em vez de senha ou código
// digitado: Hickson pediu e-mail por segurança, mas o painel do Supabase
// só libera editar o corpo do e-mail (pra incluir um código de 6 dígitos)
// com SMTP próprio configurado — sem isso, só dá pra usar o padrão, que é
// um link. Clicar no link cai em @/app/auth/confirm/route.ts, que confirma
// o token e cria a sessão.
//
// shouldCreateUser:false — só entra quem já tem conta criada manualmente
// no painel do Supabase (Authentication > Users), decisão registrada na
// Issue #48 ("o que fica de fora").

import { headers } from "next/headers";
import { checarRateLimit, RATE_LIMIT_ESTRITO } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export interface LoginAdminResult {
  ok: boolean;
  error?: string;
}

const MENSAGEM_ENVIO_INVALIDA =
  "Não foi possível enviar o link de acesso. Confirme se o e-mail está correto.";

// Reconstrói a origem (http://host:porta) a partir dos headers da própria
// requisição — funciona tanto em dev (localhost) quanto em produção, sem
// precisar de uma variável de ambiente própria só pra isso.
async function origemAtual(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${h.get("host")}`;
}

export async function enviarLinkLogin(email: string): Promise<LoginAdminResult> {
  const limite = await checarRateLimit("enviarLinkLogin", RATE_LIMIT_ESTRITO);
  if (!limite.permitido) {
    return {
      ok: false,
      error: "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  if (!email.trim()) {
    return { ok: false, error: "Informe seu e-mail." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${await origemAtual()}/auth/confirm`,
    },
  });

  if (error) {
    return { ok: false, error: MENSAGEM_ENVIO_INVALIDA };
  }

  return { ok: true };
}
