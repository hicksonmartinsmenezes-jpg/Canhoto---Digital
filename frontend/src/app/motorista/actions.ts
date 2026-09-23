"use server";

import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, isNotNull, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  diretorioRaizUploads,
  diretorioRelativoEntrega,
} from "@/lib/comprovantes-storage";
import { getDb } from "@/lib/db";
import {
  entregaAnexos,
  entregaHistorico,
  entregas,
  motoboyLocalizacoes,
} from "@/lib/db/schema";
import { checarRateLimit } from "@/lib/rate-limit";
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

const ERRO_BANCO =
  "Banco de dados indisponível neste ambiente — confirme a DATABASE_URL.";

const TAMANHO_MAX_FOTO = 8 * 1024 * 1024;
const TAMANHO_MAX_ASSINATURA = 1024 * 1024;

const EXTENSAO_POR_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

function horaLocalAtual(): string {
  return new Date().toTimeString().slice(0, 8);
}

function dataLocalAtual(): string {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function uuidValido(valor: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    valor
  );
}

function validarFoto(valor: FormDataEntryValue | null): File | null {
  if (!(valor instanceof File) || valor.size === 0) return null;
  if (!Object.hasOwn(EXTENSAO_POR_MIME, valor.type)) return null;
  if (valor.size > TAMANHO_MAX_FOTO) return null;
  return valor;
}

function validarAssinatura(valor: FormDataEntryValue | null): File | null {
  if (!(valor instanceof File) || valor.size === 0) return null;
  if (valor.type !== "image/png") return null;
  if (valor.size > TAMANHO_MAX_ASSINATURA) return null;
  return valor;
}

function bytesIguais(
  bytes: Uint8Array,
  inicio: number,
  esperado: number[]
): boolean {
  return esperado.every((valor, indice) => bytes[inicio + indice] === valor);
}

function textoAscii(bytes: Uint8Array, inicio: number, tamanho: number): string {
  return String.fromCharCode(...bytes.slice(inicio, inicio + tamanho));
}

function conteudoConfereComMime(bytes: Uint8Array, mime: string): boolean {
  if (mime === "image/jpeg") {
    return bytesIguais(bytes, 0, [0xff, 0xd8, 0xff]);
  }

  if (mime === "image/png") {
    return bytesIguais(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }

  if (mime === "image/webp") {
    return (
      textoAscii(bytes, 0, 4) === "RIFF" &&
      textoAscii(bytes, 8, 4) === "WEBP"
    );
  }

  if (mime === "image/heic" || mime === "image/heif") {
    const marca = textoAscii(bytes, 8, 4);
    return (
      textoAscii(bytes, 4, 4) === "ftyp" &&
      ["heic", "heix", "hevc", "hevx", "heif", "mif1", "msf1"].includes(
        marca
      )
    );
  }

  return false;
}

export async function iniciarEntrega(
  entregaId: string
): Promise<AcaoEntregaResult> {
  const limite = await checarRateLimit("iniciarEntrega");
  if (!limite.permitido) {
    return {
      ok: false,
      error:
        "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  const acesso = await motoristaPodeAcessarEntrega(entregaId);
  if (!acesso) return { ok: false, error: ERRO_MOTORISTA_SESSAO };

  const db = getDb();
  if (!db) return { ok: false, error: ERRO_BANCO };

  try {
    const [atualizada] = await db
      .update(entregas)
      .set({ horaSaida: horaLocalAtual() })
      .where(
        and(
          eq(entregas.id, entregaId),
          eq(entregas.motoboyId, acesso.motoboyId),
          eq(entregas.status, "pendente"),
          isNull(entregas.horaSaida)
        )
      )
      .returning({ id: entregas.id });

    if (!atualizada) {
      return {
        ok: false,
        error: "Entrega não encontrada ou já iniciada.",
      };
    }

    const [outraEmRota] = await db
      .select({ id: entregas.id })
      .from(entregas)
      .where(
        and(
          eq(entregas.motoboyId, acesso.motoboyId),
          eq(entregas.data, dataLocalAtual()),
          eq(entregas.status, "pendente"),
          isNotNull(entregas.horaSaida),
          ne(entregas.id, entregaId)
        )
      )
      .limit(1);

    if (!outraEmRota) {
      await db
        .delete(motoboyLocalizacoes)
        .where(eq(motoboyLocalizacoes.motoboyId, acesso.motoboyId));
    }
  } catch {
    return {
      ok: false,
      error: "Erro ao iniciar a entrega. Tente novamente.",
    };
  }

  revalidatePath("/motorista");
  return { ok: true };
}

export async function atualizarLocalizacaoMotorista(input: {
  latitude: number;
  longitude: number;
  precisaoMetros?: number | null;
}): Promise<AcaoEntregaResult> {
  const limite = await checarRateLimit("atualizarLocalizacaoMotorista", 30);
  if (!limite.permitido) {
    return { ok: false, error: "Muitas atualizações de localização." };
  }

  const motoboyId = await obterMotoristaAutorizado();
  if (!motoboyId) {
    return { ok: false, error: ERRO_MOTORISTA_SESSAO };
  }

  const { latitude, longitude } = input;
  const precisaoMetros = input.precisaoMetros ?? null;

  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180 ||
    (precisaoMetros !== null &&
      (!Number.isFinite(precisaoMetros) || precisaoMetros < 0))
  ) {
    return { ok: false, error: "Localização inválida." };
  }

  const db = getDb();
  if (!db) return { ok: false, error: ERRO_BANCO };

  try {
    const [emRota] = await db
      .select({ id: entregas.id })
      .from(entregas)
      .where(
        and(
          eq(entregas.motoboyId, motoboyId),
          eq(entregas.data, dataLocalAtual()),
          eq(entregas.status, "pendente"),
          isNotNull(entregas.horaSaida)
        )
      )
      .limit(1);

    if (!emRota) {
      return { ok: false, error: "Nenhuma entrega em rota no momento." };
    }

    const atualizadoEm = new Date().toISOString();

    await db
      .insert(motoboyLocalizacoes)
      .values({
        motoboyId,
        latitude: latitude.toFixed(6),
        longitude: longitude.toFixed(6),
        precisaoMetros:
          precisaoMetros === null ? null : precisaoMetros.toFixed(2),
        atualizadoEm,
      })
      .onConflictDoUpdate({
        target: motoboyLocalizacoes.motoboyId,
        set: {
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
          precisaoMetros:
            precisaoMetros === null ? null : precisaoMetros.toFixed(2),
          atualizadoEm,
        },
      });

    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Não foi possível atualizar a localização.",
    };
  }
}

export async function confirmarEntrega(
  entregaId: string,
  formData: FormData
): Promise<AcaoEntregaResult> {
  if (!uuidValido(entregaId)) {
    return { ok: false, error: "Entrega inválida." };
  }

  const limite = await checarRateLimit("confirmarEntrega");
  if (!limite.permitido) {
    return {
      ok: false,
      error:
        "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  const acesso = await motoristaPodeAcessarEntrega(entregaId);
  if (!acesso) return { ok: false, error: ERRO_MOTORISTA_SESSAO };

  const fotoEntrega = validarFoto(formData.get("fotoEntrega"));
  const comprovantePixEntrada = formData.get("comprovantePix");
  const comprovantePixFoiEnviado =
    comprovantePixEntrada instanceof File && comprovantePixEntrada.size > 0;
  const comprovantePix = validarFoto(comprovantePixEntrada);
  const assinatura = validarAssinatura(formData.get("assinatura"));

  if (!fotoEntrega) {
    return {
      ok: false,
      error:
        "Tire uma foto válida da entrega (JPG, PNG, WEBP, HEIC ou HEIF, até 8 MB).",
    };
  }

  if (comprovantePixFoiEnviado && !comprovantePix) {
    return {
      ok: false,
      error:
        "O comprovante Pix deve ser uma imagem JPG, PNG, WEBP, HEIC ou HEIF com até 8 MB.",
    };
  }

  if (!assinatura) {
    return {
      ok: false,
      error: "Colete a assinatura do cliente antes de confirmar a entrega.",
    };
  }

  const db = getDb();
  if (!db) return { ok: false, error: ERRO_BANCO };

  let entregaEhPix = false;
  let clienteNomeEntrega = "";
  let numeroEntrega = 0;

  try {
    const [entregaConfirmavel] = await db
      .select({
        id: entregas.id,
        numero: entregas.numero,
        clienteNome: entregas.clienteNome,
        formaPagamento: entregas.formaPagamento,
      })
      .from(entregas)
      .where(
        and(
          eq(entregas.id, entregaId),
          eq(entregas.motoboyId, acesso.motoboyId),
          eq(entregas.status, "pendente"),
          isNotNull(entregas.horaSaida)
        )
      )
      .limit(1);

    if (!entregaConfirmavel) {
      return {
        ok: false,
        error: "Entrega não encontrada, já concluída ou ainda não iniciada.",
      };
    }

    entregaEhPix = entregaConfirmavel.formaPagamento === "pix";
    clienteNomeEntrega = entregaConfirmavel.clienteNome;
    numeroEntrega = entregaConfirmavel.numero;
  } catch {
    return {
      ok: false,
      error: "Não foi possível validar a entrega. Tente novamente.",
    };
  }

  const comprovantePixValido =
    entregaEhPix && comprovantePix ? comprovantePix : null;

  const pastaRelativaEntrega = diretorioRelativoEntrega(
    clienteNomeEntrega,
    numeroEntrega
  );
  const pastaEntrega = path.join(
    diretorioRaizUploads(),
    ...pastaRelativaEntrega.split("/")
  );
  const nomeFotoEntrega = `foto-entrega-${randomUUID()}.${EXTENSAO_POR_MIME[fotoEntrega.type]}`;
  const nomeComprovantePix = comprovantePixValido
    ? `comprovante-pix-${randomUUID()}.${EXTENSAO_POR_MIME[comprovantePixValido.type]}`
    : null;
  const nomeAssinatura = `assinatura-${randomUUID()}.png`;

  const caminhoFotoEntrega = path.join(pastaEntrega, nomeFotoEntrega);
  const caminhoComprovantePix = nomeComprovantePix
    ? path.join(pastaEntrega, nomeComprovantePix)
    : null;
  const caminhoAssinatura = path.join(pastaEntrega, nomeAssinatura);

  const arquivoUrlFotoEntrega = `${pastaRelativaEntrega}/${nomeFotoEntrega}`;
  const arquivoUrlComprovantePix = nomeComprovantePix
    ? `${pastaRelativaEntrega}/${nomeComprovantePix}`
    : null;
  const arquivoUrlAssinatura = `${pastaRelativaEntrega}/${nomeAssinatura}`;

  let fotoEntregaGravada = false;
  let comprovantePixGravado = false;
  let assinaturaGravada = false;

  try {
    await mkdir(pastaEntrega, { recursive: true });

    const [bufferFotoEntrega, bufferAssinatura] = await Promise.all([
      fotoEntrega.arrayBuffer(),
      assinatura.arrayBuffer(),
    ]);
    const bytesFotoEntrega = new Uint8Array(bufferFotoEntrega);
    const bytesAssinatura = new Uint8Array(bufferAssinatura);

    if (!conteudoConfereComMime(bytesFotoEntrega, fotoEntrega.type)) {
      return {
        ok: false,
        error: "O conteúdo da foto da entrega não corresponde a uma imagem válida.",
      };
    }

    if (!conteudoConfereComMime(bytesAssinatura, assinatura.type)) {
      return {
        ok: false,
        error: "O conteúdo da assinatura não corresponde a uma imagem válida.",
      };
    }

    let bytesComprovantePix: Uint8Array | null = null;
    if (comprovantePixValido) {
      const bufferComprovantePix = await comprovantePixValido.arrayBuffer();
      bytesComprovantePix = new Uint8Array(bufferComprovantePix);

      if (
        !conteudoConfereComMime(
          bytesComprovantePix,
          comprovantePixValido.type
        )
      ) {
        return {
          ok: false,
          error:
            "O conteúdo do comprovante Pix não corresponde a uma imagem válida.",
        };
      }
    }

    await writeFile(caminhoFotoEntrega, bytesFotoEntrega, { flag: "wx" });
    fotoEntregaGravada = true;

    if (bytesComprovantePix && caminhoComprovantePix) {
      await writeFile(caminhoComprovantePix, bytesComprovantePix, {
        flag: "wx",
      });
      comprovantePixGravado = true;
    }

    await writeFile(caminhoAssinatura, bytesAssinatura, {
      flag: "wx",
    });
    assinaturaGravada = true;

    const confirmado = await db.transaction(async (tx) => {
      const [atualizada] = await tx
        .update(entregas)
        .set({
          clienteAssinouEm: new Date().toISOString(),
          status: "entregue",
        })
        .where(
          and(
            eq(entregas.id, entregaId),
            eq(entregas.motoboyId, acesso.motoboyId),
            eq(entregas.status, "pendente"),
            isNotNull(entregas.horaSaida)
          )
        )
        .returning({ id: entregas.id });

      if (!atualizada) return false;

      const anexosComprovante: Array<typeof entregaAnexos.$inferInsert> = [
        {
          entregaId,
          tipo: "foto",
          arquivoUrl: arquivoUrlFotoEntrega,
          capturadoPorMotoboy: acesso.motoboyId,
        },
        {
          entregaId,
          tipo: "assinatura_cliente",
          arquivoUrl: arquivoUrlAssinatura,
          capturadoPorMotoboy: acesso.motoboyId,
        },
      ];

      if (arquivoUrlComprovantePix) {
        anexosComprovante.splice(1, 0, {
          entregaId,
          tipo: "comprovante_pix",
          arquivoUrl: arquivoUrlComprovantePix,
          capturadoPorMotoboy: acesso.motoboyId,
        });
      }

      await tx.insert(entregaAnexos).values(anexosComprovante);

      await tx.insert(entregaHistorico).values({
        entregaId,
        statusAnterior: "pendente",
        statusNovo: "entregue",
        alteradoPorMotoboy: acesso.motoboyId,
        observacao: arquivoUrlComprovantePix
          ? "Entrega confirmada com foto da entrega, comprovante Pix e assinatura do cliente."
          : "Entrega confirmada com foto da entrega e assinatura do cliente.",
      });

      return true;
    });

    if (!confirmado) {
      throw new Error("ENTREGA_NAO_CONFIRMAVEL");
    }
  } catch (error) {
    await Promise.allSettled([
      fotoEntregaGravada
        ? rm(caminhoFotoEntrega, { force: true })
        : Promise.resolve(),
      comprovantePixGravado && caminhoComprovantePix
        ? rm(caminhoComprovantePix, { force: true })
        : Promise.resolve(),
      assinaturaGravada
        ? rm(caminhoAssinatura, { force: true })
        : Promise.resolve(),
    ]);

    if (error instanceof Error && error.message === "ENTREGA_NAO_CONFIRMAVEL") {
      return {
        ok: false,
        error: "Entrega já concluída ou não está mais disponível.",
      };
    }

    return {
      ok: false,
      error:
        "Não foi possível salvar os comprovantes. Confira a conexão e tente novamente.",
    };
  }

  revalidatePath("/motorista");
  revalidatePath("/canhotos");
  revalidatePath("/");
  return { ok: true };
}
