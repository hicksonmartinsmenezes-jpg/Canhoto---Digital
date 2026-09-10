"use server";

import { redirect } from "next/navigation";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export interface ConfirmarLoginResult {
  ok: boolean;
  error?: string;
}

function destinoSeguro(next: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  try {
    const url = new URL(next, "http://canhoto.local");
    if (url.origin !== "http://canhoto.local") return "/";
  } catch {
    return "/";
  }
  return next;
}

export async function confirmarLogin(
  tokenHash: string,
  type: string,
  next: string
): Promise<ConfirmarLoginResult> {
  if (!tokenHash || type !== "magiclink") {
    return { ok: false, error: "Link de acesso inválido ou expirado. Peça um novo na tela de login." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: type as EmailOtpType,
    token_hash: tokenHash,
  });

  if (error) {
    return { ok: false, error: "Link de acesso inválido ou expirado. Peça um novo na tela de login." };
  }

  redirect(destinoSeguro(next));
}
