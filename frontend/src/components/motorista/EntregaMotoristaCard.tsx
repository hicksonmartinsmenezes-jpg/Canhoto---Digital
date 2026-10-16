import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  MapPin,
  Navigation,
} from "lucide-react";
import type { EntregaMotorista } from "@/lib/data/entregas";
import { FORMA_PAGAMENTO_LABEL } from "@/lib/status";

export function EntregaMotoristaCard({
  entrega,
}: {
  entrega: EntregaMotorista;
}) {
  const entregue = entrega.status === "entregue";
  const emRota = entrega.status === "pendente" && entrega.horaSaida !== null;

  return (
    <Link
      href={`/motorista/entregas/${entrega.id}`}
      className="group block border-b border-slate-100 bg-white px-4 py-3 transition last:border-b-0 active:bg-slate-50"
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-full ${
            entregue
              ? "bg-[#E7F8EF] text-[#169653]"
              : emRota
                ? "bg-[#E9F2FF] text-[#1768D8]"
                : "text-[#F07A12]"
          }`}
        >
          {entregue ? (
            <CheckCircle2 className="size-5" />
          ) : emRota ? (
            <Navigation className="size-5" />
          ) : (
            <Clock3 className="size-5" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {!emRota && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                  entregue
                    ? "bg-[#E7F8EF] text-[#169653]"
                    : "text-[#D96B0B]"
                }`}
              >
                {entregue ? "Concluída" : "Pendente"}
              </span>
            )}
            <span className="text-[11px] font-extrabold text-slate-500">
              {entrega.numero}
            </span>
          </div>

          <h3 className="mt-2 truncate text-[16px] font-black leading-tight text-[#0A1F44]">
            {entrega.clienteNome}
          </h3>

          {entrega.endereco && (
            <p className="mt-1.5 flex items-start gap-1.5 text-[12px] font-medium leading-5 text-slate-500">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-[#315A8E]" />
              <span className="line-clamp-2">
                {entrega.endereco}
                {entrega.cep ? ` · CEP ${entrega.cep}` : ""}
              </span>
            </p>
          )}

          {(!entregue || (emRota && entrega.horaSaida)) && (
            <div className="mt-1.5 flex items-center justify-between gap-3">
              {!entregue ? (
                <p className="min-w-0 truncate text-[12px] font-bold text-[#0A1F44]">
                  {entrega.valor}{" "}
                  <span className="font-semibold text-slate-500">
                    · {FORMA_PAGAMENTO_LABEL[entrega.formaPagamento]}
                  </span>
                </p>
              ) : (
                <span />
              )}

              {emRota && entrega.horaSaida && (
                <p className="flex shrink-0 items-center gap-1.5 text-[11px] font-bold text-[#1768D8]">
                  <Clock3 className="size-3.5" />
                  Saída às {entrega.horaSaida.slice(0, 5)}
                </p>
              )}
            </div>
          )}
        </div>

        <ChevronRight className="mt-6 size-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
