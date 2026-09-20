"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Loader2,
  MapPin,
  Navigation,
  ReceiptText,
  Truck,
} from "lucide-react";
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
    <article className="rounded-xl border border-[#1c355e] bg-[#0e1e38] p-4 shadow-lg shadow-black/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.12em] text-amber-400">
            Entrega {entrega.numero}
          </p>
          <h2 className="mt-1 truncate text-base font-extrabold text-white">
            {entrega.clienteNome}
          </h2>
        </div>

        <span
          className={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${
            entregue
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : emRota
                ? "border-sky-500/30 bg-sky-500/10 text-sky-300"
                : "border-amber-400/30 bg-amber-400/10 text-amber-400"
          }`}
        >
          {entregue ? "Concluída" : emRota ? "Em rota" : "A fazer"}
        </span>
      </div>

      {entrega.endereco && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#1c355e] bg-[#162b4d]/60 px-3 py-2.5">
          <MapPin className="mt-0.5 size-4 shrink-0 text-amber-400" />
          <p className="text-sm leading-5 text-slate-200">{entrega.endereco}</p>
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-[#1c355e] bg-[#162b4d]/50 px-3 py-2">
          <div className="flex items-center gap-1.5 text-slate-400">
            <ReceiptText className="size-3.5" />
            Pagamento
          </div>
          <p className="mt-1 font-bold text-white">
            {FORMA_PAGAMENTO_LABEL[entrega.formaPagamento]}
          </p>
        </div>

        <div className="rounded-lg border border-[#1c355e] bg-[#162b4d]/50 px-3 py-2">
          <p className="text-slate-400">Valor</p>
          <p className="mt-1 font-bold text-white">{entrega.valor}</p>
        </div>
      </div>

      {erro && (
        <div className="mt-3 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-300">
          {erro}
        </div>
      )}

      {entregue ? (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-extrabold text-emerald-400">
          <CheckCircle2 className="size-4" />
          Entrega concluída
        </div>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={executar}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-3 text-sm font-black text-[#080f1d] transition hover:bg-amber-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
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
              <Navigation className="size-4" />
              Iniciar entrega
            </>
          )}
        </button>
      )}

      {!entregue && emRota && (
        <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-400">
          <Truck className="size-3.5" />
          Entrega iniciada e vinculada à sua sessão
        </p>
      )}
    </article>
  );
}
