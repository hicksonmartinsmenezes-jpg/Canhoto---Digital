"use server";

import { headers } from "next/headers";
import { checarRateLimit, RATE_LIMIT_ESTRITO } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export interface LoginAdminResult {
  ok: boolean;
  error?: string;
}

const MENSAGEM_ENVIO_INVALIDA =
  "Não foi possível enviar o link de acesso. Confirme se o e-mail está correto.";

async function origemLogin(): Promise<string | null> {
  const configurada = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configurada) {
    try {
      const url = new URL(configurada);
      if (url.protocol === "https:" || url.hostname === "localhost") return url.origin;
    } catch {
      return null;
    }
  }

  if (process.env.NODE_ENV !== "production") {
    const h = await headers();
    const host = h.get("host");
    if (!host) return null;
    return `http://${host}`;
  }

  return null;
}

export async function enviarLinkLogin(email: string): Promise<LoginAdminResult> {
  const limite = await checarRateLimit("enviarLinkLogin", RATE_LIMIT_ESTRITO);
  if (!limite.permitido) {
    return { ok: false, error: "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo." };
  }

  const emailNormalizado = email.trim().toLowerCase();
  if (!emailNormalizado) return { ok: false, error: "Informe seu e-mail." };

  const origem = await origemLogin();
  if (!origem) return { ok: false, error: MENSAGEM_ENVIO_INVALIDA };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: emailNormalizado,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${origem}/auth/confirm`,
    },
  });

  if (error) return { ok: false, error: MENSAGEM_ENVIO_INVALIDA };
  return { ok: true };
}
