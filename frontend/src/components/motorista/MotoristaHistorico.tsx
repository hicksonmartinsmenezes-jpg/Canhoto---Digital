import {
  CheckCircle2,
  Clock3,
  MapPin,
  PackageCheck,
} from "lucide-react";
import { FORMA_PAGAMENTO_LABEL } from "@/lib/status";
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
  return (
    <section>
      <div className="mb-5">
        <p className="text-sm font-semibold text-slate-500">Histórico</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-[#071A3D]">
          Entregas concluídas
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Últimas {Math.min(entregas.length, 20)} entregas finalizadas.
        </p>
      </div>

      {entregas.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-slate-100 text-slate-400">
            <PackageCheck className="size-6" />
          </span>
          <p className="mt-4 text-base font-extrabold text-[#071A3D]">
            Nenhuma entrega concluída
          </p>
          <p className="mt-1 text-sm text-slate-500">
            As entregas finalizadas aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {entregas.map((entrega) => {
            const horaEntrega = hora(entrega.clienteAssinouEm);

            return (
              <article
                key={entrega.id}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.06)]"
              >
                <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/70 px-5 py-3">
                  <span className="inline-flex items-center gap-2 text-sm font-extrabold text-emerald-700">
                    <CheckCircle2 className="size-4.5" />
                    Entrega concluída
                  </span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                    {entrega.numero}
                  </span>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        {entrega.data}
                      </p>
                      <h3 className="mt-1 text-lg font-extrabold text-[#071A3D]">
                        {entrega.clienteNome}
                      </h3>
                    </div>

                    {horaEntrega && (
                      <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-emerald-600">
                        <Clock3 className="size-3.5" />
                        {horaEntrega}
                      </span>
                    )}
                  </div>

                  {entrega.endereco && (
                    <p className="mt-3 flex items-start gap-2 text-sm text-slate-500">
                      <MapPin className="mt-0.5 size-4 shrink-0" />
                      <span>
                        {entrega.endereco}
                        {entrega.cep ? ` · CEP ${entrega.cep}` : ""}
                      </span>
                    </p>
                  )}

                  <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4 text-sm">
                    <span className="font-extrabold text-slate-700">
                      {entrega.valor}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="font-semibold text-slate-500">
                      {FORMA_PAGAMENTO_LABEL[entrega.formaPagamento]}
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
