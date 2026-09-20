"use client";

import dynamic from "next/dynamic";
import { Card } from "@/components/ui/Card";
import { useMotoristasEmRota } from "@/components/dashboard/useMotoristasEmRota";
import type { MotoristaEmRota } from "@/lib/data/entregas";

const MotoboyMap = dynamic(
  () => import("./MotoboyMap").then((mod) => mod.MotoboyMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs text-slate-500">
        Carregando mapa…
      </div>
    ),
  }
);

export function MotoboyMapCard({
  motoristasIniciais,
}: {
  motoristasIniciais: MotoristaEmRota[];
}) {
  const motoristas = useMotoristasEmRota(motoristasIniciais);
  const comLocalizacao = motoristas.filter(
    (motorista) =>
      motorista.latitude !== null && motorista.longitude !== null
  ).length;
  const semLocalizacao = motoristas.length - comLocalizacao;

  return (
    <Card className="flex flex-col overflow-hidden p-0">
      <div className="flex items-center justify-between px-6 py-5">
        <div>
          <h2 className="text-[17px] font-bold">Motoristas em rota</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Dados reais das entregas iniciadas hoje.
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
          {motoristas.length} em rota
        </span>
      </div>

      <div className="relative h-[260px] w-full border-t border-slate-200">
        <MotoboyMap motoristas={motoristas} />

        {motoristas.length === 0 && (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[500] border border-slate-200 bg-white/95 px-3 py-2 text-center text-xs font-semibold text-slate-600 shadow-sm">
            Nenhum motorista em rota no momento.
          </div>
        )}

        {motoristas.length > 0 && comLocalizacao === 0 && (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[500] border border-slate-200 bg-white/95 px-3 py-2 text-center text-xs font-semibold text-slate-600 shadow-sm">
            Há motoristas em rota, mas nenhuma localização foi compartilhada ainda.
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 px-6 py-3 text-[11px] text-slate-500">
        {motoristas.length === 0
          ? "Atualização automática a cada 15 segundos."
          : semLocalizacao > 0
            ? `${comLocalizacao} com localização · ${semLocalizacao} sem localização compartilhada`
            : `${comLocalizacao} motorista${comLocalizacao === 1 ? "" : "s"} com última localização registrada`}
      </div>
    </Card>
  );
}
