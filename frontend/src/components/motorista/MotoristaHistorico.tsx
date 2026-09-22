import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  MapPin,
  PackageCheck,
} from "lucide-react";
import type { EntregaHistoricoMotorista } from "@/lib/data/entregas";

function hora(valor: string | null): string | null {
  if (!valor) return null;

  return new Date(valor).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MotoristaHistorico({
  entregas,
}: {
  entregas: EntregaHistoricoMotorista[];
}) {
  if (entregas.length === 0) {
    return (
      <div className="border-y border-slate-200 bg-white px-4 py-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-slate-100 text-slate-400">
          <PackageCheck className="size-6" />
        </span>
        <p className="mt-4 text-base font-black text-[#0A1F44]">
          Nenhuma entrega concluída
        </p>
        <p className="mt-1 text-sm font-medium text-slate-500">
          As entregas finalizadas aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <section>
      <div className="flex gap-2 overflow-x-auto px-4 pb-3">
        <span className="rounded-full bg-[#1768D8] px-3.5 py-2 text-xs font-black text-white">
          Todas
        </span>
        <span className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-black text-slate-500">
          Concluídas
        </span>
      </div>

      <div className="border-y border-slate-200 bg-white">
        {entregas.map((entrega) => {
          const horaEntrega = hora(entrega.clienteAssinouEm);

          return (
            <Link
              key={entrega.id}
              href={`/motorista/entregas/${entrega.id}`}
              className="group block border-b border-slate-100 bg-white px-4 py-3 last:border-b-0"
            >
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#E7F8EF] text-[#169653]">
                  <CheckCircle2 className="size-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-[#E7F8EF] px-2 py-0.5 text-[10px] font-black text-[#169653]">
                      Concluída
                    </span>
                    <span className="text-[11px] font-extrabold text-slate-500">
                      {entrega.numero}
                    </span>
                  </div>

                  <h3 className="mt-2 truncate text-[16px] font-black text-[#0A1F44]">
                    {entrega.clienteNome}
                  </h3>

                  {entrega.endereco && (
                    <p className="mt-1.5 flex items-start gap-1.5 text-[12px] font-medium leading-5 text-slate-500">
                      <MapPin className="mt-0.5 size-3.5 shrink-0 text-[#315A8E]" />
                      <span className="line-clamp-1">{entrega.endereco}</span>
                    </p>
                  )}

                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                    <Clock3 className="size-3.5" />
                    {entrega.data}
                    {horaEntrega ? ` · ${horaEntrega}` : ""}
                  </p>
                </div>

                <ChevronRight className="mt-6 size-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
