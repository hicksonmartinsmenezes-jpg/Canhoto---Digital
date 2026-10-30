"use server";

import {
  MAX_BYTES_PDF,
  ehPdf,
  lerDadosNfeDoTextoDanfe,
  type DadosNfe,
} from "@/lib/documento-fiscal";
import { extrairTextoPdf } from "@/lib/pdf-texto";
import { obterOperadorAutenticado } from "@/lib/operador-auth";
import { checarRateLimit } from "@/lib/rate-limit";

export interface LerDanfePdfResult {
  ok: boolean;
  dados?: DadosNfe;
  error?: string;
}

/**
 * Lê do PDF (DANFE) os mesmos campos que o XML preenche — usado só quando a
 * entrega não tem XML anexado, já que a leitura do PDF depende do layout de
 * cada emissor e é bem menos confiável (ver lerDadosNfeDoTextoDanfe).
 */
export async function lerDanfePdf(
  formData: FormData
): Promise<LerDanfePdfResult> {
  const operador = await obterOperadorAutenticado();
  if (!operador) return { ok: false, error: "Sessão inválida ou expirada." };

  const limite = await checarRateLimit("lerDanfePdf");
  if (!limite.permitido) {
    return {
      ok: false,
      error:
        "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  const arquivo = formData.get("documento");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { ok: false, error: "Nenhum arquivo enviado." };
  }
  if (arquivo.size > MAX_BYTES_PDF) {
    return {
      ok: false,
      error: `Arquivo grande demais (máximo ${MAX_BYTES_PDF / 1024 / 1024} MB).`,
    };
  }

  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  if (!ehPdf(bytes)) {
    return { ok: false, error: "Arquivo não é um PDF válido." };
  }

  let texto: string;
  try {
    texto = await extrairTextoPdf(bytes);
  } catch (error) {
    console.error("lerDanfePdf: falha ao extrair texto do PDF", error);
    return { ok: false, error: "Não foi possível ler o texto do PDF." };
  }

  if (!texto.trim()) {
    return {
      ok: false,
      error:
        "O PDF não tem texto pra ler (provável digitalização/escaneado).",
    };
  }

  return { ok: true, dados: lerDadosNfeDoTextoDanfe(texto) };
}
