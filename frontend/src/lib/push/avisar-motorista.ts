import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { dispositivosPush, entregas } from "@/lib/db/schema";
import {
  enviarPush,
  enviarPushComDetalhe,
  pushConfigurado,
  type MensagemPush,
} from "./fcm";

function chaveDiaLocal(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** Texto da notificação de entrega nova. */
export function mensagemEntregaNova(entrega: {
  id: string;
  numero: number;
  clienteNome: string;
  endereco: string | null;
}): MensagemPush {
  return {
    titulo: `Nova entrega #${entrega.numero}`,
    corpo: entrega.endereco
      ? `${entrega.clienteNome} · ${entrega.endereco}`
      : entrega.clienteNome,
    dados: { tipo: "nova", url: `/motorista/entregas/${entrega.id}` },
  };
}

export type MotivoRetirada = "cancelada" | "reatribuida";

export function mensagemEntregaRetirada(
  entrega: { numero: number; clienteNome: string },
  motivo: MotivoRetirada
): MensagemPush {
  return {
    titulo:
      motivo === "cancelada"
        ? `Entrega #${entrega.numero} cancelada`
        : `Entrega #${entrega.numero} passou para outro motorista`,
    corpo: `${entrega.clienteNome} saiu da sua lista.`,
    dados: { tipo: motivo, url: "/motorista" },
  };
}

/** Envia para todos os celulares do motorista e descarta os que não existem mais. */
async function enviarParaMotorista(
  motoboyId: string,
  mensagem: MensagemPush
): Promise<void> {
  if (!pushConfigurado()) return;
  const db = getDb();
  if (!db) return;

  const aparelhos = await db
    .select({ id: dispositivosPush.id, token: dispositivosPush.token })
    .from(dispositivosPush)
    .where(eq(dispositivosPush.motoboyId, motoboyId));
  if (aparelhos.length === 0) return;

  const invalidos: string[] = [];
  await Promise.all(
    aparelhos.map(async (aparelho) => {
      const resultado = await enviarPush(aparelho.token, mensagem);
      if (resultado === "token-invalido") invalidos.push(aparelho.id);
    })
  );

  if (invalidos.length > 0) {
    await db
      .delete(dispositivosPush)
      .where(inArray(dispositivosPush.id, invalidos));
  }
}

/**
 * Avisa o motorista de uma entrega que acabou de ficar com ele. Não avisa de
 * entrega de outro dia (a lista dele só mostra as de hoje) nem de já concluída
 * ou cancelada. Nunca lança erro: aviso é melhor-esforço e não pode travar a
 * ação de quem cadastrou a entrega.
 */
export async function avisarEntregaNovaAoMotorista(
  entregaId: string
): Promise<void> {
  try {
    const db = getDb();
    if (!db || !pushConfigurado()) return;

    const [entrega] = await db
      .select({
        id: entregas.id,
        numero: entregas.numero,
        clienteNome: entregas.clienteNome,
        endereco: entregas.endereco,
        motoboyId: entregas.motoboyId,
        status: entregas.status,
        data: entregas.data,
      })
      .from(entregas)
      .where(eq(entregas.id, entregaId))
      .limit(1);

    if (
      !entrega ||
      !entrega.motoboyId ||
      entrega.status !== "pendente" ||
      entrega.data !== chaveDiaLocal(new Date())
    ) {
      return;
    }

    await enviarParaMotorista(entrega.motoboyId, mensagemEntregaNova(entrega));
  } catch (erro) {
    console.error("[push] falha ao avisar entrega nova", erro);
  }
}

/** Avisa o motorista de que uma entrega saiu da lista dele (cancelada/reatribuída). */
export async function avisarEntregaRetiradaDoMotorista(
  entregaId: string,
  motoboyId: string,
  motivo: MotivoRetirada
): Promise<void> {
  try {
    const db = getDb();
    if (!db || !pushConfigurado()) return;

    const [entrega] = await db
      .select({
        numero: entregas.numero,
        clienteNome: entregas.clienteNome,
        data: entregas.data,
      })
      .from(entregas)
      .where(eq(entregas.id, entregaId))
      .limit(1);

    if (!entrega || entrega.data !== chaveDiaLocal(new Date())) return;

    await enviarParaMotorista(motoboyId, mensagemEntregaRetirada(entrega, motivo));
  } catch (erro) {
    console.error("[push] falha ao avisar entrega retirada", erro);
  }
}

export interface ResultadoTestePush {
  configurado: boolean;
  aparelhos: number;
  enviados: number;
  /** Primeiro motivo de falha, em texto simples (sem token nem chave). */
  erro?: string;
}

/** Envia um aviso de teste aos celulares do motorista e diz o que aconteceu. */
export async function enviarAvisoDeTeste(
  motoboyId: string
): Promise<ResultadoTestePush> {
  if (!pushConfigurado()) {
    return {
      configurado: false,
      aparelhos: 0,
      enviados: 0,
      erro: "O servidor da loja ainda não está com o Firebase configurado (FIREBASE_SERVICE_ACCOUNT_FILE).",
    };
  }

  const db = getDb();
  if (!db) {
    return { configurado: true, aparelhos: 0, enviados: 0, erro: "Banco indisponível." };
  }

  const aparelhos = await db
    .select({ id: dispositivosPush.id, token: dispositivosPush.token })
    .from(dispositivosPush)
    .where(eq(dispositivosPush.motoboyId, motoboyId));

  if (aparelhos.length === 0) {
    return {
      configurado: true,
      aparelhos: 0,
      enviados: 0,
      erro: "Nenhum celular registrado para este motorista.",
    };
  }

  let enviados = 0;
  let erro: string | undefined;
  const invalidos: string[] = [];
  for (const aparelho of aparelhos) {
    const envio = await enviarPushComDetalhe(aparelho.token, {
      titulo: "Aviso de teste",
      corpo: "Se você viu isto, as notificações estão funcionando.",
      dados: { tipo: "teste", url: "/motorista" },
    });
    if (envio.resultado === "ok") enviados += 1;
    else erro ??= envio.detalhe;
    if (envio.resultado === "token-invalido") invalidos.push(aparelho.id);
  }
  if (invalidos.length > 0) {
    await db.delete(dispositivosPush).where(inArray(dispositivosPush.id, invalidos));
  }

  return { configurado: true, aparelhos: aparelhos.length, enviados, erro };
}
