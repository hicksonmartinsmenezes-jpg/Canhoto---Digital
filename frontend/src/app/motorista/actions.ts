"use server";

import { createHash, randomUUID } from "node:crypto";
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
import { MAX_FOTOS_PRODUTO } from "@/lib/comprovante-limites";
import { MAX_PARADAS_ROTA, MIN_PARADAS_ROTA } from "@/lib/rota-limites";
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
  /**
   * Só em confirmarEntrega: a entrega já estava concluída por este motorista
   * (reenvio depois que a resposta do envio anterior se perdeu). Nada foi
   * gravado de novo; para o app é sucesso.
   */
  jaConcluida?: boolean;
}

const ERRO_BANCO =
  "Banco de dados indisponível neste ambiente — confirme a DATABASE_URL.";

const TAMANHO_MAX_FOTO = 8 * 1024 * 1024;

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

// Reenvio seguro: se a resposta de um envio anterior se perdeu (sinal caiu
// depois do servidor gravar), o app tenta de novo e a entrega já está
// "entregue". Isso não é erro — confere que é desta mesma motorista antes.
async function entregaJaConcluidaPeloMotorista(
  db: NonNullable<ReturnType<typeof getDb>>,
  entregaId: string,
  motoboyId: string
): Promise<boolean> {
  const [concluida] = await db
    .select({ id: entregas.id })
    .from(entregas)
    .where(
      and(
        eq(entregas.id, entregaId),
        eq(entregas.motoboyId, motoboyId),
        eq(entregas.status, "entregue")
      )
    )
    .limit(1);

  return Boolean(concluida);
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

/**
 * Inicia de uma vez várias entregas aguardando saída como uma rota. A ordem
 * do array é a ordem das paradas (a primeira é a 1ª a visitar). Tudo ou nada:
 * se qualquer entrega não estiver mais disponível, nenhuma é iniciada.
 */
export async function iniciarRota(
  entregaIds: string[]
): Promise<AcaoEntregaResult> {
  const limite = await checarRateLimit("iniciarRota");
  if (!limite.permitido) {
    return {
      ok: false,
      error:
        "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  if (
    !Array.isArray(entregaIds) ||
    entregaIds.length < MIN_PARADAS_ROTA ||
    entregaIds.length > MAX_PARADAS_ROTA ||
    new Set(entregaIds).size !== entregaIds.length ||
    !entregaIds.every((id) => typeof id === "string" && uuidValido(id))
  ) {
    return {
      ok: false,
      error: `Escolha de ${MIN_PARADAS_ROTA} a ${MAX_PARADAS_ROTA} entregas para a rota.`,
    };
  }

  const motoboyId = await obterMotoristaAutorizado();
  if (!motoboyId) return { ok: false, error: ERRO_MOTORISTA_SESSAO };

  const db = getDb();
  if (!db) return { ok: false, error: ERRO_BANCO };

  try {
    await db.transaction(async (tx) => {
      const rotaId = randomUUID();
      const horaSaida = horaLocalAtual();

      for (const [indice, entregaId] of entregaIds.entries()) {
        const [atualizada] = await tx
          .update(entregas)
          .set({ horaSaida, rotaId, rotaOrdem: indice + 1 })
          .where(
            and(
              eq(entregas.id, entregaId),
              eq(entregas.motoboyId, motoboyId),
              eq(entregas.status, "pendente"),
              isNull(entregas.horaSaida)
            )
          )
          .returning({ id: entregas.id });

        // Lançar desfaz as paradas já marcadas: é tudo ou nada.
        if (!atualizada) throw new Error("ROTA_ENTREGA_INDISPONIVEL");
      }
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "ROTA_ENTREGA_INDISPONIVEL"
    ) {
      return {
        ok: false,
        error:
          "Alguma entrega da rota não está mais disponível. Atualize a lista e monte a rota de novo.",
      };
    }
    return {
      ok: false,
      error: "Erro ao iniciar a rota. Tente novamente.",
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

function normalizarRecebedorNome(valor: FormDataEntryValue | null): string | null {
  if (typeof valor !== "string") return null;
  const nome = valor.replace(/\s+/g, " ").trim();
  if (nome.length < 2 || nome.length > 120) return null;
  return nome;
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

  const recebedorNome = normalizarRecebedorNome(formData.get("recebedorNome"));
  if (!recebedorNome) {
    return {
      ok: false,
      error: "Informe o nome de quem recebeu a mercadoria.",
    };
  }

  const fotoEntrega = validarFoto(formData.get("fotoEntrega"));
  const comprovantePixEntrada = formData.get("comprovantePix");
  const comprovantePixFoiEnviado =
    comprovantePixEntrada instanceof File && comprovantePixEntrada.size > 0;
  const comprovantePix = validarFoto(comprovantePixEntrada);
  const fotosProdutoEntrada = formData
    .getAll("fotoProduto")
    .filter((item) => item instanceof File && item.size > 0);
  const fotosProduto = fotosProdutoEntrada
    .map((item) => validarFoto(item))
    .filter((item): item is File => item !== null);

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

  if (fotosProdutoEntrada.length > MAX_FOTOS_PRODUTO) {
    return {
      ok: false,
      error: `Envie no máximo ${MAX_FOTOS_PRODUTO} fotos do produto.`,
    };
  }

  if (fotosProduto.length !== fotosProdutoEntrada.length) {
    return {
      ok: false,
      error:
        "As fotos do produto devem ser imagens JPG, PNG, WEBP, HEIC ou HEIF com até 8 MB cada.",
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
      if (
        await entregaJaConcluidaPeloMotorista(db, entregaId, acesso.motoboyId)
      ) {
        return { ok: true, jaConcluida: true };
      }

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

  // Decisão da loja (08/10/2026): o comprovante Pix e a foto do produto são
  // sempre opcionais; a assinatura do cliente deixou de ser coletada.
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

  // Ordem em que os anexos são gravados e listados.
  const arquivos: Array<{
    tipo: "foto" | "comprovante_pix" | "foto_produto";
    arquivo: File;
    prefixo: string;
    descricao: string;
    nome: string;
    caminho: string;
    url: string;
    gravado: boolean;
    sha256: string;
  }> = [];
  function adicionarArquivo(
    tipo: "foto" | "comprovante_pix" | "foto_produto",
    arquivo: File,
    prefixo: string,
    descricao: string
  ) {
    const nome = `${prefixo}-${randomUUID()}.${EXTENSAO_POR_MIME[arquivo.type]}`;
    arquivos.push({
      tipo,
      arquivo,
      prefixo,
      descricao,
      nome,
      caminho: path.join(pastaEntrega, nome),
      url: `${pastaRelativaEntrega}/${nome}`,
      gravado: false,
      sha256: "",
    });
  }
  adicionarArquivo("foto", fotoEntrega, "foto-entrega", "da foto da entrega");
  if (comprovantePixValido) {
    adicionarArquivo(
      "comprovante_pix",
      comprovantePixValido,
      "comprovante-pix",
      "do comprovante Pix"
    );
  }
  for (const fotoProduto of fotosProduto) {
    adicionarArquivo(
      "foto_produto",
      fotoProduto,
      "foto-produto",
      "da foto do produto"
    );
  }

  try {
    await mkdir(pastaEntrega, { recursive: true });

    const conteudos = await Promise.all(
      arquivos.map(async (item) => new Uint8Array(await item.arquivo.arrayBuffer()))
    );

    for (const [indice, item] of arquivos.entries()) {
      if (!conteudoConfereComMime(conteudos[indice], item.arquivo.type)) {
        return {
          ok: false,
          error: `O conteúdo ${item.descricao} não corresponde a uma imagem válida.`,
        };
      }
    }

    for (const [indice, item] of arquivos.entries()) {
      item.sha256 = createHash("sha256").update(conteudos[indice]).digest("hex");
    }

    for (const [indice, item] of arquivos.entries()) {
      await writeFile(item.caminho, conteudos[indice], { flag: "wx" });
      item.gravado = true;
    }

    const confirmado = await db.transaction(async (tx) => {
      // clienteAssinouEm guarda o horário em que a entrega foi concluída (o
      // nome é antigo, da época da assinatura do cliente).
      const [atualizada] = await tx
        .update(entregas)
        .set({
          clienteAssinouEm: new Date().toISOString(),
          recebedorNome,
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

      await tx.insert(entregaAnexos).values(
        arquivos.map((item) => ({
          entregaId,
          tipo: item.tipo,
          arquivoUrl: item.url,
          sha256: item.sha256,
          capturadoPorMotoboy: acesso.motoboyId,
        }))
      );

      const itensConfirmados = ["foto da entrega"];
      if (comprovantePixValido) itensConfirmados.push("comprovante Pix");
      if (fotosProduto.length === 1) itensConfirmados.push("foto do produto");
      if (fotosProduto.length > 1) {
        itensConfirmados.push(`${fotosProduto.length} fotos do produto`);
      }
      const textoItens =
        itensConfirmados.length === 1
          ? itensConfirmados[0]
          : `${itensConfirmados.slice(0, -1).join(", ")} e ${itensConfirmados[itensConfirmados.length - 1]}`;

      await tx.insert(entregaHistorico).values({
        entregaId,
        statusAnterior: "pendente",
        statusNovo: "entregue",
        alteradoPorMotoboy: acesso.motoboyId,
        observacao: `Entrega confirmada com ${textoItens}. Recebido por ${recebedorNome}.`,
      });

      return true;
    });

    if (!confirmado) {
      throw new Error("ENTREGA_NAO_CONFIRMAVEL");
    }
  } catch (error) {
    await Promise.allSettled(
      arquivos
        .filter((item) => item.gravado)
        .map((item) => rm(item.caminho, { force: true }))
    );

    if (error instanceof Error && error.message === "ENTREGA_NAO_CONFIRMAVEL") {
      // Dois envios simultâneos da mesma entrega (ex.: reenvio automático
      // junto com o toque do motorista): o que chegou depois não é erro.
      try {
        if (
          await entregaJaConcluidaPeloMotorista(db, entregaId, acesso.motoboyId)
        ) {
          return { ok: true, jaConcluida: true };
        }
      } catch {
        // cai no erro genérico abaixo
      }

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

  // Sem mais entregas em rota, apaga a última posição guardada: o painel
  // não deve continuar mostrando o motorista "em rota" num ponto antigo.
  // Best-effort — a entrega já foi confirmada, falhar aqui não pode desfazê-la.
  try {
    const [aindaEmRota] = await db
      .select({ id: entregas.id })
      .from(entregas)
      .where(
        and(
          eq(entregas.motoboyId, acesso.motoboyId),
          eq(entregas.status, "pendente"),
          isNotNull(entregas.horaSaida)
        )
      )
      .limit(1);

    if (!aindaEmRota) {
      await db
        .delete(motoboyLocalizacoes)
        .where(eq(motoboyLocalizacoes.motoboyId, acesso.motoboyId));
    }
  } catch (error) {
    console.error("confirmarEntrega: falha ao limpar localização", error);
  }

  revalidatePath("/motorista");
  revalidatePath("/canhotos");
  revalidatePath("/");
  return { ok: true };
}
