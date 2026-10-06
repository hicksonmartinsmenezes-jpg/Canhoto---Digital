"use client";

import Link from "next/link";
import { AlertTriangle, CloudOff, Loader2 } from "lucide-react";
import { useRascunhosComprovante } from "@/components/motorista/useRascunhosComprovante";

/**
 * Aviso no topo da lista do motorista: comprovantes guardados no aparelho que
 * ainda não chegaram ao servidor. Some sozinho quando tudo for enviado e não
 * ocupa espaço nenhum quando não há nada pendente. Também é quem reenvia
 * enquanto o motorista está na lista.
 */
export function MotoristaEnvioPendente() {
  const { rascunhos, enviando } = useRascunhosComprovante();

  if (rascunhos.length === 0) return null;

  const recusados = rascunhos.filter((r) => r.rejeitado).length;

  return (
    <section
      className="border-b border-amber-200 bg-amber-50 px-4 py-3"
      role="status"
      aria-live="polite"
    >
      <p className="flex items-center gap-2 text-sm font-black text-amber-900">
        {enviando.length > 0 ? (
          <Loader2 className="size-4 animate-spin" />
        ) : recusados > 0 ? (
          <AlertTriangle className="size-4" />
        ) : (
          <CloudOff className="size-4" />
        )}
        {rascunhos.length === 1
          ? "1 comprovante aguardando envio"
          : `${rascunhos.length} comprovantes aguardando envio`}
      </p>
      <p className="mt-0.5 text-xs font-medium text-amber-800">
        Estão salvos neste aparelho e serão enviados sozinhos quando o sinal
        voltar. Não feche as entregas sem conferir.
      </p>

      <ul className="mt-2 space-y-1">
        {rascunhos.map((rascunho) => (
          <li key={rascunho.entregaId}>
            <Link
              href={`/motorista/entregas/${rascunho.entregaId}`}
              className="flex items-center justify-between gap-3 rounded-xl bg-white/70 px-3 py-2 text-xs font-bold text-amber-900"
            >
              <span className="truncate">
                {rascunho.rotulo ?? "Entrega"}
              </span>
              <span className="shrink-0 text-[11px] font-black">
                {enviando.includes(rascunho.entregaId)
                  ? "Enviando..."
                  : rascunho.rejeitado
                    ? "Precisa de atenção"
                    : "Aguardando sinal"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
