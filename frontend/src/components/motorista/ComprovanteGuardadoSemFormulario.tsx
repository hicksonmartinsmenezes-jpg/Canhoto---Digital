"use client";

import { ComprovanteGuardadoPainel } from "@/components/motorista/ComprovanteGuardadoPainel";
import { useRascunhosComprovante } from "@/components/motorista/useRascunhosComprovante";

/**
 * Entrega que já não aceita comprovante (cancelada, reatribuída, ainda não
 * iniciada) mas que deixou um comprovante guardado neste aparelho. Sem isto o
 * motorista veria "precisa de atenção" na lista e, ao abrir a entrega, nada —
 * sem como descartar o que ficou guardado.
 */
export function ComprovanteGuardadoSemFormulario({
  entregaId,
}: {
  entregaId: string;
}) {
  const { rascunhos, enviando, enviarAgora, descartar } =
    useRascunhosComprovante(entregaId);
  const rascunho = rascunhos[0];

  if (!rascunho) return null;

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <ComprovanteGuardadoPainel
        rascunho={rascunho}
        enviando={enviando.includes(entregaId)}
        onEnviarAgora={() => void enviarAgora(entregaId)}
        onDescartar={() => void descartar(entregaId)}
      />
    </section>
  );
}
