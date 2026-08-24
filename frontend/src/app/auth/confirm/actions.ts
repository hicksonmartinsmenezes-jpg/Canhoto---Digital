"use server";

// Server Action que efetivamente confirma o login por link (Issue #48).
// Fica separada do carregamento da página /auth/confirm de propósito: se
// o token fosse consumido só por um GET na página, verificadores
// automáticos de link (Gmail, antivírus, proxy corporativo — muitos fazem
// um "pre-fetch" de toda URL que chega por e-mail pra escanear phishing)
// consumiriam o link ANTES do Hickson clicar de verdade, fazendo-o chegar
// sempre "expirado" — foi exatamente esse bug visto na prática. Exigir um
// clique real (que dispara esta Server Action) evita isso, porque
// scanners automáticos não interagem com botões, só seguem GET/HEAD.
import { redirect } from "next/navigation";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export interface ConfirmarLoginResult {
  ok: boolean;
  error?: string;
}

export async function confirmarLogin(
  tokenHash: string,
  type: string,
  next: string
): Promise<ConfirmarLoginResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: type as EmailOtpType,
    token_hash: tokenHash,
  });

  if (error) {
    return {
      ok: false,
      error: "Link de acesso inválido ou expirado. Peça um novo na tela de login.",
    };
  }

  redirect(next);
}
