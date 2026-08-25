"use client";

// Card de uma entrega na lista do app do motorista (Issue #5, sub-issue
// #30) — mostra "Iniciar entrega" quando ainda não saiu, "Confirmar
// entrega" quando já está em rota, e um estado só de leitura quando já
// entregue. "Em rota" é calculado (status "pendente" + hora_saida
// preenchida), não é um status próprio — mesma regra usada em
// @/lib/data/entregas (getAlertas/getEntregasDoMotorista).

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, MapPin, Truck } from "lucide-react";
import { FORMA_PAGAMENTO_LABEL } from "@/lib/status";
import { confirmarEntrega, iniciarEntrega } from "@/app/motorista/actions";
import type { EntregaMotorista } from "@/lib/data/entregas";

export function EntregaMotoristaCard({
  entrega,
}: {
  entrega: EntregaMotorista;
}) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const emRota = entrega.status === "pendente" && entrega.horaSaida !== null;
  const entregue = entrega.status === "entregue";

  function executar() {
    setErro(null);
    const acao = emRota ? confirmarEntrega : iniciarEntrega;
    startTransition(async () => {
      const resultado = await acao(entrega.id);
      if (!resultado.ok) {
        setErro(resultado.error ?? "Não foi possível concluir a ação.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            {entrega.numero}
          </p>
          <p className="text-base font-bold text-[#0A1F44]">
            {entrega.clienteNome}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
            entregue
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : emRota
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-slate-200 bg-slate-50 text-slate-500"
          }`}
        >
          {entregue ? "Entregue" : emRota ? "Em rota" : "Aguardando saída"}
        </span>
      </div>

      {entrega.endereco && (
        <p className="mt-2 flex items-start gap-1.5 text-sm text-slate-500">
          <MapPin className="mt-0.5 size-4 shrink-0" />
          {entrega.endereco}
        </p>
      )}

      <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
        <span className="font-bold">{entrega.valor}</span>
        <span className="text-slate-300">•</span>
        <span>{FORMA_PAGAMENTO_LABEL[entrega.formaPagamento]}</span>
      </div>

      {erro && (
        <div className="mt-3 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700">
          {erro}
        </div>
      )}

      {entregue ? (
        <div className="mt-4 flex items-center justify-center gap-1.5 text-sm font-bold text-emerald-600">
          <CheckCircle2 className="size-4" />
          Entrega concluída
        </div>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={executar}
          className="mt-4 inline-flex w-full items-center justify-center gap-1.5 bg-amber-500 px-4 py-2.5 text-sm font-bold text-white transition-[transform,background-color] duration-150 hover:bg-amber-400 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {emRota ? "Confirmando..." : "Iniciando..."}
            </>
          ) : emRota ? (
            <>
              <CheckCircle2 className="size-4" />
              Confirmar entrega
            </>
          ) : (
            <>
              <Truck className="size-4" />
              Iniciar entrega
            </>
          )}
        </button>
      )}
    </div>
  );
}
