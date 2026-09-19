"use server";

// Server Actions da área logada do app do motorista.
//
// A identidade do motorista é sempre derivada da sessão assinada e validada
// no banco pela camada `motorista-authorization`. O client nunca informa
// qual motorista está autenticado.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { checarRateLimit } from "@/lib/rate-limit";
import { descreverErroSupabase } from "@/lib/erros-supabase";
import {
  ERRO_MOTORISTA_SESSAO,
  motoristaPodeAcessarEntrega,
  obterMotoristaAutorizado,
} from "@/lib/motorista-authorization";
import { encerrarSessaoMotorista } from "@/lib/motorista-session";

export async function sairMotorista(): Promise<void> {
  await encerrarSessaoMotorista();
  redirect("/motorista/login");
}

export interface AcaoEntregaResult {
  ok: boolean;
  error?: string;
}

const ERRO_SUPABASE =
  "O Supabase ainda não está configurado neste ambiente — confirme o .env.local.";

export async function iniciarEntrega(
  entregaId: string
): Promise<AcaoEntregaResult> {
  const limite = await checarRateLimit("iniciarEntrega");
  if (!limite.permitido) {
    return {
      ok: false,
      error: "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  const acesso = await motoristaPodeAcessarEntrega(entregaId);
  if (!acesso) return { ok: false, error: ERRO_MOTORISTA_SESSAO };

  const supabase = createAdminClient();
  if (!supabase) return { ok: false, error: ERRO_SUPABASE };

  const { data, error } = await supabase
    .from("entregas")
    .update({ hora_saida: new Date().toISOString() })
    .eq("id", entregaId)
    .eq("motoboy_id", acesso.motoboyId)
    .eq("status", "pendente")
    .is("hora_saida", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: `Erro ao iniciar a entrega: ${descreverErroSupabase(error.message)}.` };
  }
  if (!data) {
    return { ok: false, error: "Entrega não encontrada ou já iniciada." };
  }

  await supabase.from("entrega_eventos_motorista").insert({
    entrega_id: entregaId,
    motoboy_id: acesso.motoboyId,
    tipo: "saida_iniciada",
  });

  revalidatePath("/motorista");
  return { ok: true };
}

export async function confirmarEntrega(
  entregaId: string
): Promise<AcaoEntregaResult> {
  const limite = await checarRateLimit("confirmarEntrega");
  if (!limite.permitido) {
    return {
      ok: false,
      error: "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  const acesso = await motoristaPodeAcessarEntrega(entregaId);
  if (!acesso) return { ok: false, error: ERRO_MOTORISTA_SESSAO };

  const supabase = createAdminClient();
  if (!supabase) return { ok: false, error: ERRO_SUPABASE };

  const { data: comprovantes, error: comprovantesError } = await supabase
    .from("entrega_anexos")
    .select("tipo")
    .eq("entrega_id", entregaId)
    .eq("capturado_por_motoboy_id", acesso.motoboyId)
    .in("tipo", ["foto", "assinatura_cliente"]);

  if (comprovantesError) {
    return { ok: false, error: "Não foi possível validar os comprovantes da entrega." };
  }

  const tipos = new Set((comprovantes ?? []).map((item) => item.tipo));
  if (!tipos.has("foto") || !tipos.has("assinatura_cliente")) {
    return {
      ok: false,
      error: "Antes de confirmar, registre a foto e a assinatura do cliente.",
    };
  }

  const { data, error } = await supabase
    .from("entregas")
    .update({ cliente_assinou_em: new Date().toISOString(), status: "entregue" })
    .eq("id", entregaId)
    .eq("motoboy_id", acesso.motoboyId)
    .eq("status", "pendente")
    .not("hora_saida", "is", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: `Erro ao confirmar a entrega: ${descreverErroSupabase(error.message)}.` };
  }
  if (!data) {
    return {
      ok: false,
      error: "Entrega não encontrada ou ainda não iniciada.",
    };
  }

  await supabase.from("entrega_eventos_motorista").insert({
    entrega_id: entregaId,
    motoboy_id: acesso.motoboyId,
    tipo: "entrega_confirmada",
  });

  revalidatePath("/motorista");
  return { ok: true };
}


const TIPOS_ANEXO = ["foto", "assinatura_cliente"] as const;
type TipoAnexoMotorista = (typeof TIPOS_ANEXO)[number];

const MAX_BYTES = 8 * 1024 * 1024;
const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function anexarComprovante(
  entregaId: string,
  tipo: TipoAnexoMotorista,
  arquivo: File,
  requestId: string
): Promise<AcaoEntregaResult> {
  const limite = await checarRateLimit("anexarComprovante");
  if (!limite.permitido) {
    return {
      ok: false,
      error: "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  if (!TIPOS_ANEXO.includes(tipo)) {
    return { ok: false, error: "Tipo de comprovante inválido." };
  }

  if (!/^[0-9a-fA-F-]{36}$/.test(requestId)) {
    return { ok: false, error: "Identificador da operação inválido." };
  }

  if (arquivo.size <= 0 || arquivo.size > MAX_BYTES) {
    return { ok: false, error: "Arquivo inválido ou maior que 8 MB." };
  }

  const extensao = MIME_EXT[arquivo.type];
  if (!extensao) {
    return { ok: false, error: "Formato não permitido. Use JPG, PNG ou WebP." };
  }

  if (tipo === "assinatura_cliente" && arquivo.type !== "image/png") {
    return { ok: false, error: "A assinatura deve ser enviada em PNG." };
  }

  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const ehJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const ehPng =
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  const ehWebp =
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;

  const assinaturaValida =
    (arquivo.type === "image/jpeg" && ehJpeg) ||
    (arquivo.type === "image/png" && ehPng) ||
    (arquivo.type === "image/webp" && ehWebp);

  if (!assinaturaValida) {
    return { ok: false, error: "O conteúdo do arquivo não corresponde ao formato informado." };
  }

  const acesso = await motoristaPodeAcessarEntrega(entregaId);
  if (!acesso) return { ok: false, error: ERRO_MOTORISTA_SESSAO };

  const supabase = createAdminClient();
  if (!supabase) return { ok: false, error: ERRO_SUPABASE };

  const { data: existente, error: existenteError } = await supabase
    .from("entrega_anexos")
    .select("id")
    .eq("request_id", requestId)
    .maybeSingle();

  if (!existenteError && existente) {
    return { ok: true };
  }

  const caminho = `entregas/${entregaId}/${acesso.motoboyId}/${requestId}.${extensao}`;

  const { error: uploadError } = await supabase.storage
    .from("entrega-anexos")
    .upload(caminho, arquivo, {
      contentType: arquivo.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    return {
      ok: false,
      error: "Não foi possível salvar o comprovante.",
    };
  }

  const { error: registroError } = await supabase.from("entrega_anexos").insert({
    entrega_id: entregaId,
    tipo,
    arquivo_url: caminho,
    request_id: requestId,
    capturado_por_motoboy_id: acesso.motoboyId,
  });

  if (registroError) {
    await supabase.storage.from("entrega-anexos").remove([caminho]);
    return {
      ok: false,
      error: "Não foi possível registrar o comprovante.",
    };
  }

  await supabase.from("entrega_eventos_motorista").insert({
    entrega_id: entregaId,
    motoboy_id: acesso.motoboyId,
    tipo: tipo === "foto" ? "comprovante_foto" : "comprovante_assinatura",
  });

  revalidatePath("/motorista");
  return { ok: true };
}


export async function salvarObservacaoMotorista(
  entregaId: string,
  observacao: string
): Promise<AcaoEntregaResult> {
  const limite = await checarRateLimit("salvarObservacaoMotorista");
  if (!limite.permitido) {
    return { ok: false, error: "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo." };
  }

  const acesso = await motoristaPodeAcessarEntrega(entregaId);
  if (!acesso) return { ok: false, error: ERRO_MOTORISTA_SESSAO };

  const valor = observacao.trim();
  if (valor.length > 1000) {
    return { ok: false, error: "A observação deve ter no máximo 1.000 caracteres." };
  }

  const supabase = createAdminClient();
  if (!supabase) return { ok: false, error: ERRO_SUPABASE };

  const { data, error } = await supabase
    .from("entregas")
    .update({ observacoes: valor || null })
    .eq("id", entregaId)
    .eq("motoboy_id", acesso.motoboyId)
    .eq("status", "pendente")
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: `Erro ao salvar observação: ${descreverErroSupabase(error.message)}.` };
  }
  if (!data) return { ok: false, error: "Entrega não encontrada ou já concluída." };

  await supabase.from("entrega_eventos_motorista").insert({
    entrega_id: entregaId,
    motoboy_id: acesso.motoboyId,
    tipo: "observacao_atualizada",
  });

  revalidatePath("/motorista");
  revalidatePath(`/motorista/entregas/${entregaId}`);
  return { ok: true };
}
