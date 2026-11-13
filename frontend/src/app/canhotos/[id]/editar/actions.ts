"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { obterOperadorAutenticado } from "@/lib/operador-auth";
import { getDb } from "@/lib/db";
import { mensagemErroBanco } from "@/lib/db/errors";
import { entregaHistorico, entregas, motoboys } from "@/lib/db/schema";
import { checarRateLimit } from "@/lib/rate-limit";
import {
  avisarEntregaNovaAoMotorista,
  avisarEntregaRetiradaDoMotorista,
} from "@/lib/push/avisar-motorista";
import { geocodificarEntregaGratis } from "@/lib/geocodificacao-gratis";
import {
  descreverAlteracoes,
  observacaoDeAlteracoes,
  type NomesMotoboy,
} from "@/lib/auditoria-entrega";
import type { FormaPagamento, StatusEntrega } from "@/types/database";

export interface AtualizarEntregaInput {
  data: string;
  clienteNome: string;
  clienteTelefone: string;
  endereco: string;
  cep: string;
  numeroPedido: string;
  numeroNfe: string;
  /** Venda a consumidor final: sem NF-e (o número da nota é ignorado). */
  clienteFinal: boolean;
  valorPagamento: number;
  formaPagamento: FormaPagamento | "";
  motoboyId: string;
  observacoes: string;
  status: StatusEntrega;
}

const ERRO_CONCLUIDA_SO_ADMIN =
  "Entrega já concluída: só o administrador pode alterar os dados.";

export interface AtualizarEntregaResult {
  ok: boolean;
  error?: string;
}

export async function atualizarEntrega(
  id: string,
  input: AtualizarEntregaInput
): Promise<AtualizarEntregaResult> {
  const operador = await obterOperadorAutenticado();
  if (!operador) {
    return { ok: false, error: "Sessão inválida ou expirada." };
  }

  const limite = await checarRateLimit("atualizarEntrega");
  if (!limite.permitido) {
    return {
      ok: false,
      error:
        "Muitas tentativas em pouco tempo — aguarde um minuto e tente de novo.",
    };
  }

  const db = getDb();
  if (!db) {
    return {
      ok: false,
      error:
        "Banco de dados indisponível neste ambiente — confirme a DATABASE_URL.",
    };
  }

  const clienteNome = input.clienteNome.trim();
  if (!clienteNome) {
    return { ok: false, error: "Informe o nome do cliente." };
  }
  if (!input.valorPagamento || input.valorPagamento <= 0) {
    return { ok: false, error: "Informe um valor de pagamento válido." };
  }
  if (!input.formaPagamento) {
    return { ok: false, error: "Selecione a forma de pagamento." };
  }
  const formaPagamento: FormaPagamento = input.formaPagamento;
  const cep = input.cep.replace(/\D/g, "");
  if (cep && cep.length !== 8) {
    return { ok: false, error: "Informe um CEP válido com 8 dígitos." };
  }

  const [dadosAtuais] = await db
    .select({
      endereco: entregas.endereco,
      cep: entregas.cep,
      latitude: entregas.latitude,
      longitude: entregas.longitude,
      setorId: entregas.setorId,
      status: entregas.status,
    })
    .from(entregas)
    .where(eq(entregas.id, id))
    .limit(1);

  if (!dadosAtuais) {
    return { ok: false, error: "Entrega não encontrada." };
  }

  // Entrega concluída mexe com o caixa: só o Admin corrige, e tudo que ele
  // muda fica no histórico (ver descreverAlteracoes abaixo).
  if (operador.tipo === "gestor_setor" && dadosAtuais.status === "entregue") {
    return { ok: false, error: ERRO_CONCLUIDA_SO_ADMIN };
  }

  const enderecoNovo = input.endereco.trim();
  const enderecoMudou =
    enderecoNovo !== (dadosAtuais.endereco ?? "").trim() ||
    cep !== (dadosAtuais.cep ?? "");

  const coordenadasExistentes =
    dadosAtuais.latitude !== null && dadosAtuais.longitude !== null
      ? {
          latitude: Number(dadosAtuais.latitude),
          longitude: Number(dadosAtuais.longitude),
        }
      : null;

  const coordenadas =
    enderecoMudou
      ? await geocodificarEntregaGratis({
          endereco: enderecoNovo,
          cep,
        })
      : coordenadasExistentes ??
        (enderecoNovo
          ? await geocodificarEntregaGratis({
              endereco: enderecoNovo,
              cep,
            })
          : null);

  try {
    const resultadoTransacao = await db.transaction(async (tx) => {
      const [atual] = await tx
        .select({
          status: entregas.status,
          data: entregas.data,
          clienteNome: entregas.clienteNome,
          valorPagamento: entregas.valorPagamento,
          formaPagamento: entregas.formaPagamento,
          motoboyId: entregas.motoboyId,
        })
        .from(entregas)
        .where(eq(entregas.id, id))
        .limit(1);

      if (!atual) {
        return { ok: false as const, error: "Entrega não encontrada." };
      }

      if (input.status === "entregue" && atual.status !== "entregue") {
        return {
          ok: false as const,
          error:
            "A entrega só pode ser concluída pelo fluxo do motorista com a foto do canhoto.",
        };
      }

      if (atual.status === "entregue" && input.status !== "entregue") {
        return {
          ok: false as const,
          error:
            "Uma entrega concluída com comprovante não pode voltar para outro status.",
        };
      }

      // Cancelar tem ação própria (com motivo obrigatório no histórico).
      if (input.status === "cancelado" && atual.status !== "cancelado") {
        return {
          ok: false as const,
          error:
            "Para cancelar, use o botão Cancelar entrega — o motivo fica registrado no histórico.",
        };
      }

      const [resultado] = await tx
        .update(entregas)
        .set({
          data: input.data,
          clienteNome,
          clienteTelefone: input.clienteTelefone.trim() || null,
          endereco: enderecoNovo || null,
          cep: cep || null,
          latitude:
            coordenadas === null ? null : coordenadas.latitude.toFixed(6),
          longitude:
            coordenadas === null ? null : coordenadas.longitude.toFixed(6),
          numeroPedido: input.numeroPedido.trim() || null,
          numeroNfe: input.clienteFinal ? null : input.numeroNfe.trim() || null,
          clienteFinal: input.clienteFinal,
          valorPagamento: input.valorPagamento.toFixed(2),
          formaPagamento,
          motoboyId: input.motoboyId || null,
          observacoes: input.observacoes.trim() || null,
          status: input.status,
        })
        .where(eq(entregas.id, id))
        .returning({ id: entregas.id });

      if (!resultado) {
        return { ok: false as const, error: "Entrega não encontrada." };
      }

      const motoboyNovo = input.motoboyId || null;
      const motoboyMudou = (atual.motoboyId ?? null) !== motoboyNovo;
      const nomes: NomesMotoboy = {};
      if (motoboyMudou) {
        const ids = [atual.motoboyId, motoboyNovo].filter(
          (v): v is string => Boolean(v)
        );
        if (ids.length > 0) {
          const linhas = await tx
            .select({ id: motoboys.id, nome: motoboys.nome })
            .from(motoboys)
            .where(inArray(motoboys.id, ids));
          for (const linha of linhas) nomes[linha.id] = linha.nome;
        }
      }

      const mudancas = descreverAlteracoes(
        {
          data: atual.data,
          clienteNome: atual.clienteNome,
          valorPagamento: Number(atual.valorPagamento),
          formaPagamento: atual.formaPagamento,
          motoboyId: atual.motoboyId,
        },
        {
          data: input.data,
          clienteNome,
          valorPagamento: input.valorPagamento,
          formaPagamento,
          motoboyId: motoboyNovo,
        },
        nomes
      );

      if (atual.status !== input.status || mudancas.length > 0) {
        await tx.insert(entregaHistorico).values({
          entregaId: id,
          statusAnterior: atual.status,
          statusNovo: input.status,
          alteradoPor: operador.colaboradorId,
          alteradoPorAdmin:
            operador.tipo === "admin" && !operador.colaboradorId
              ? operador.usuarioAdminId
              : null,
          ...(mudancas.length > 0
            ? { observacao: observacaoDeAlteracoes(mudancas) }
            : {}),
        });
      }

      return {
        ok: true as const,
        motoboyAnterior: atual.motoboyId,
        motoboyNovo,
        reativada: atual.status === "cancelado" && input.status === "pendente",
      };
    });

    if (!resultadoTransacao.ok) {
      return resultadoTransacao;
    }

    // Push ao motorista: ficou com a entrega (nova ou reativada) ou perdeu-a.
    // Em segundo plano; falha de aviso nunca afeta a edição.
    const { motoboyAnterior, motoboyNovo, reativada } = resultadoTransacao;
    if (motoboyNovo && (motoboyNovo !== motoboyAnterior || reativada)) {
      void avisarEntregaNovaAoMotorista(id);
    }
    if (motoboyAnterior && motoboyAnterior !== motoboyNovo) {
      void avisarEntregaRetiradaDoMotorista(id, motoboyAnterior, "reatribuida");
    }
  } catch (error) {
    return {
      ok: false,
      error: mensagemErroBanco("atualizarEntrega", error),
    };
  }

  revalidatePath("/canhotos");
  revalidatePath("/motorista");
  revalidatePath("/");
  return { ok: true };
}
