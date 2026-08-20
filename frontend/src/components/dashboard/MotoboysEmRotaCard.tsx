import { Bike } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { MOTOBOYS_EM_ROTA } from "@/lib/em-rota-mock";

// Quem já saiu para entrega e ainda não confirmou com o cliente — dá pra
// montar isso hoje só com o campo `hora_saida`, sem depender de GPS. Ver
// nota sobre o futuro app do motoboy + mapeamento em
// claude/ideias-decisoes-projeto.md.
export function MotoboysEmRotaCard() {
  return (
    <Card className="p-7">
      <div className="mb-[22px] flex items-center justify-between">
        <h2 className="text-[17px] font-bold">Motoristas em rota</h2>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
          <span className="size-1.5 rounded-full bg-emerald-600" />
          {MOTOBOYS_EM_ROTA.length} agora
        </span>
      </div>

      <div>
        {MOTOBOYS_EM_ROTA.map((m) => (
          <div
            key={m.id}
            className="mb-3.5 flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-slate-50/50 p-4 transition-colors last:mb-0 hover:border-amber-500/35"
          >
            <span className="grid size-[46px] shrink-0 place-items-center rounded-xl bg-[#0A1F44]/10 text-[#0A1F44]">
              <Bike className="size-[22px]" strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-bold">{m.motoboy}</p>
                <span className="whitespace-nowrap text-[10px] font-bold text-amber-600">
                  {m.tempoEmRota}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                Entrega {m.entregaNumero} · {m.cliente} · saiu às{" "}
                {m.horaSaida}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
