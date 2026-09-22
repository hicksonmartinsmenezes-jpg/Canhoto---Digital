"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  MapPin,
  PackageCheck,
  Search,
} from "lucide-react";
import type { EntregaHistoricoMotorista } from "@/lib/data/entregas";

type Periodo = "hoje" | "7dias" | "30dias" | "todas";

const PERIODOS: Array<{ id: Periodo; label: string }> = [
  { id: "hoje", label: "Hoje" },
  { id: "7dias", label: "7 dias" },
  { id: "30dias", label: "30 dias" },
  { id: "todas", label: "Todas" },
];

function normalizar(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function dataConclusao(entrega: EntregaHistoricoMotorista): Date {
  if (entrega.clienteAssinouEm) {
    return new Date(entrega.clienteAssinouEm);
  }

  const [dia, mes, ano] = entrega.data.split("/").map(Number);
  return new Date(ano, mes - 1, dia, 12, 0, 0);
}

function inicioDoDia(data: Date): Date {
  const inicio = new Date(data);
  inicio.setHours(0, 0, 0, 0);
  return inicio;
}

function dentroDoPeriodo(
  entrega: EntregaHistoricoMotorista,
  periodo: Periodo
): boolean {
  if (periodo === "todas") return true;

  const agora = new Date();
  const conclusao = dataConclusao(entrega);
  const hoje = inicioDoDia(agora);

  if (periodo === "hoje") {
    return conclusao >= hoje;
  }

  const inicio = new Date(hoje);
  inicio.setDate(inicio.getDate() - (periodo === "7dias" ? 6 : 29));

  return conclusao >= inicio;
}

function hora(valor: string | null): string | null {
  if (!valor) return null;

  return new Date(valor).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function tituloGrupo(entrega: EntregaHistoricoMotorista): string {
  const data = dataConclusao(entrega);
  const hoje = inicioDoDia(new Date());
  const diaEntrega = inicioDoDia(data);
  const diferencaDias = Math.round(
    (hoje.getTime() - diaEntrega.getTime()) / 86_400_000
  );

  if (diferencaDias === 0) return "Hoje";
  if (diferencaDias === 1) return "Ontem";

  return entrega.data;
}

export function MotoristaHistorico({
  entregas,
}: {
  entregas: EntregaHistoricoMotorista[];
}) {
  const [periodo, setPeriodo] = useState<Periodo>("30dias");
  const [busca, setBusca] = useState("");

  const filtradas = useMemo(() => {
    const termo = normalizar(busca);

    return entregas.filter((entrega) => {
      if (!dentroDoPeriodo(entrega, periodo)) return false;
      if (!termo) return true;

      return normalizar(
        [
          entrega.numero,
          entrega.clienteNome,
          entrega.endereco,
          entrega.cep,
        ].join(" ")
      ).includes(termo);
    });
  }, [busca, entregas, periodo]);

  const grupos = useMemo(() => {
    const agrupadas = new Map<string, EntregaHistoricoMotorista[]>();

    for (const entrega of filtradas) {
      const chave = tituloGrupo(entrega);
      const atual = agrupadas.get(chave) ?? [];
      atual.push(entrega);
      agrupadas.set(chave, atual);
    }

    return Array.from(agrupadas.entries());
  }, [filtradas]);

  if (entregas.length === 0) {
    return (
      <div className="mx-4 rounded-3xl border border-slate-200 bg-white px-5 py-10 text-center shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-slate-100 text-slate-400">
          <PackageCheck className="size-6" />
        </span>
        <p className="mt-4 text-base font-black text-[#0A1F44]">
          Nenhuma entrega concluída
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-4 px-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar cliente, endereço ou nº"
            aria-label="Buscar no histórico"
            className="h-11 w-full rounded-2xl border border-slate-200 bg-[#F8FAFC] pl-10 pr-3 text-sm font-semibold text-[#0A1F44] outline-none transition placeholder:text-slate-400 focus:border-[#1768D8] focus:bg-white"
          />
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5">
          {PERIODOS.map((item) => {
            const ativo = periodo === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPeriodo(item.id)}
                aria-pressed={ativo}
                className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-black transition ${
                  ativo
                    ? "bg-[#1768D8] text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <p className="text-[12px] font-bold text-slate-500">
          {filtradas.length}{" "}
          {filtradas.length === 1 ? "entrega encontrada" : "entregas encontradas"}
        </p>
      </div>

      {filtradas.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-9 text-center">
          <Search className="mx-auto size-6 text-slate-400" />
          <p className="mt-3 text-sm font-black text-[#0A1F44]">
            Nenhuma entrega encontrada
          </p>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Tente outro período ou termo de busca.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {grupos.map(([grupo, itens]) => (
            <div key={grupo}>
              <div className="mb-2 flex items-center gap-2 px-1">
                <h2 className="text-[12px] font-black uppercase tracking-[0.08em] text-slate-500">
                  {grupo}
                </h2>
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                {itens.map((entrega) => {
                  const horaEntrega = hora(entrega.clienteAssinouEm);

                  return (
                    <Link
                      key={entrega.id}
                      href={`/motorista/entregas/${entrega.id}`}
                      className="group flex items-center gap-3 border-b border-slate-100 px-4 py-4 transition last:border-b-0 active:bg-slate-50"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-[#E7F8EF] text-[#169653]">
                        <CheckCircle2 className="size-5" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-[15px] font-black text-[#0A1F44]">
                            {entrega.clienteNome}
                          </h3>
                          <span className="shrink-0 text-[11px] font-extrabold text-slate-400">
                            {entrega.numero}
                          </span>
                        </div>

                        {entrega.endereco && (
                          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[12px] font-medium text-slate-500">
                            <MapPin className="size-3.5 shrink-0 text-[#315A8E]" />
                            <span className="truncate">{entrega.endereco}</span>
                          </p>
                        )}

                        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                          <Clock3 className="size-3.5" />
                          {horaEntrega ?? "Horário não registrado"}
                        </p>
                      </div>

                      <ChevronRight className="size-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
