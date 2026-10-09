// Motor de envio do comprovante guardado no aparelho. Fica separado da
// interface e recebe tudo de fora (leitura, gravação, envio) para poder ser
// testado sem navegador nem servidor.

import {
  fotosDoProduto,
  type RascunhoComprovante,
} from "@/lib/comprovante-pendente";

/** Rascunho velho demais é descartado (entrega provavelmente já resolvida). */
export const VALIDADE_RASCUNHO_MS = 14 * 24 * 60 * 60 * 1000;

export type ResultadoServidor = {
  ok: boolean;
  error?: string;
  jaConcluida?: boolean;
};

export type EstadoEnvio =
  /** Servidor confirmou; rascunho apagado. */
  | "enviado"
  /** Sem conexão ou erro do servidor: continua guardado, vai tentar de novo. */
  | "rede"
  /** Servidor recusou: o reenvio automático para até alguém decidir. */
  | "rejeitado"
  /** Já há um envio desta entrega em andamento nesta página. */
  | "ocupado"
  /** Não há rascunho para esta entrega. */
  | "inexistente"
  /** Rascunho passou da validade e foi apagado. */
  | "expirado";

export interface ResultadoEnvioRascunho {
  estado: EstadoEnvio;
  mensagem?: string;
}

export interface DependenciasEnvio {
  ler(entregaId: string): Promise<RascunhoComprovante | null>;
  apagar(entregaId: string): Promise<void>;
  atualizar(
    entregaId: string,
    alteracoes: Partial<
      Pick<RascunhoComprovante, "tentativas" | "rejeitado" | "ultimoErro">
    >
  ): Promise<void>;
  enviar(entregaId: string, formData: FormData): Promise<ResultadoServidor>;
  agora(): number;
}

const MENSAGEM_REDE =
  "Sem conexão com o servidor. O comprovante está guardado neste aparelho e será enviado sozinho quando o sinal voltar.";

const emEnvio = new Set<string>();

function extensaoDaFoto(tipo: string): string {
  if (tipo === "image/png") return "png";
  if (tipo === "image/webp") return "webp";
  if (tipo === "image/heic") return "heic";
  if (tipo === "image/heif") return "heif";
  return "jpg";
}

export function montarFormData(rascunho: RascunhoComprovante): FormData {
  const formData = new FormData();

  formData.set(
    "fotoEntrega",
    new File([rascunho.fotoEntrega], `foto-entrega.${extensaoDaFoto(rascunho.fotoEntrega.type)}`, {
      type: rascunho.fotoEntrega.type,
    })
  );

  if (rascunho.comprovantePix) {
    formData.set(
      "comprovantePix",
      new File(
        [rascunho.comprovantePix],
        `comprovante-pix.${extensaoDaFoto(rascunho.comprovantePix.type)}`,
        { type: rascunho.comprovantePix.type }
      )
    );
  }

  for (const [indice, foto] of fotosDoProduto(rascunho).entries()) {
    formData.append(
      "fotoProduto",
      new File([foto], `foto-produto-${indice + 1}.${extensaoDaFoto(foto.type)}`, {
        type: foto.type,
      })
    );
  }

  return formData;
}

export async function enviarRascunho(
  entregaId: string,
  deps: DependenciasEnvio
): Promise<ResultadoEnvioRascunho> {
  // Impede dois envios da mesma entrega ao mesmo tempo (lista + tela da
  // entrega + reenvio automático). O servidor também aguenta, mas assim nem
  // gasta o 4G enviando duas vezes.
  if (emEnvio.has(entregaId)) return { estado: "ocupado" };
  emEnvio.add(entregaId);

  try {
    const rascunho = await deps.ler(entregaId);
    if (!rascunho) return { estado: "inexistente" };

    if (deps.agora() - rascunho.criadoEm > VALIDADE_RASCUNHO_MS) {
      await deps.apagar(entregaId);
      return { estado: "expirado" };
    }

    let resultado: ResultadoServidor;
    try {
      resultado = await deps.enviar(entregaId, montarFormData(rascunho));
    } catch {
      await deps.atualizar(entregaId, {
        tentativas: rascunho.tentativas + 1,
        rejeitado: false,
        ultimoErro: MENSAGEM_REDE,
      });
      return { estado: "rede", mensagem: MENSAGEM_REDE };
    }

    if (resultado.ok) {
      await deps.apagar(entregaId);
      return { estado: "enviado" };
    }

    const mensagem =
      resultado.error ?? "O servidor não aceitou o comprovante.";
    await deps.atualizar(entregaId, {
      tentativas: rascunho.tentativas + 1,
      rejeitado: true,
      ultimoErro: mensagem,
    });
    return { estado: "rejeitado", mensagem };
  } finally {
    emEnvio.delete(entregaId);
  }
}
