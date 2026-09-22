"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Bike,
  Clock3,
  MapPin,
  Navigation,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useMotoristasEmRota } from "@/components/dashboard/useMotoristasEmRota";
import type { MotoristaEmRota } from "@/lib/data/entregas";

const MotoboyMap = dynamic(
  () => import("./MotoboyMap").then((mod) => mod.MotoboyMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs font-medium text-slate-500">
        Carregando mapa…
      </div>
    ),
  }
);

function formatarAtualizacao(valor: string | null): string {
  if (!valor) return "Sem localização";

  return new Date(valor).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resumoEntregas(motorista: MotoristaEmRota): string {
  const numeros = motorista.entregas.map((entrega) => entrega.numero);

  if (numeros.length === 0) return "Sem entrega";
  if (numeros.length <= 2) return numeros.join(" · ");

  return `${numeros.slice(0, 2).join(" · ")} +${numeros.length - 2}`;
}

function iniciais(nome: string): string {
  return (
    nome
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0]?.toUpperCase())
      .join("") || "M"
  );
}

export function MotoboyMapCard({
  motoristasIniciais,
}: {
  motoristasIniciais: MotoristaEmRota[];
}) {
  const motoristas = useMotoristasEmRota(motoristasIniciais);
  const [selecionadoId, setSelecionadoId] = useState<string | null>(
    motoristasIniciais.find(
      (motorista) =>
        motorista.latitude !== null && motorista.longitude !== null
    )?.motoboyId ?? motoristasIniciais[0]?.motoboyId ?? null
  );

  const comLocalizacao = useMemo(
    () =>
      motoristas.filter(
        (motorista) =>
          motorista.latitude !== null && motorista.longitude !== null
      ).length,
    [motoristas]
  );

  const primeiroComLocalizacao = motoristas.find(
    (motorista) =>
      motorista.latitude !== null && motorista.longitude !== null
  );

  const selecionadoEfetivoId =
    selecionadoId &&
    motoristas.some((motorista) => motorista.motoboyId === selecionadoId)
      ? selecionadoId
      : primeiroComLocalizacao?.motoboyId ?? motoristas[0]?.motoboyId ?? null;

  const motoristaSelecionado =
    motoristas.find(
      (motorista) => motorista.motoboyId === selecionadoEfetivoId
    ) ?? null;

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-[#0A1F44] text-white">
            <Bike className="size-4.5" />
          </span>

          <div>
            <h2 className="text-[17px] font-bold text-[#0A1F44]">
              Motoristas em rota
            </h2>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              {motoristas.length} em rota · {comLocalizacao} com localização
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-white lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="text-xs font-bold text-slate-500">
              Em rota
            </span>
            <span className="text-xs font-black text-[#0A1F44]">
              {motoristas.length}
            </span>
          </div>

          {motoristas.length === 0 ? (
            <div className="flex min-h-32 flex-col items-center justify-center px-5 py-8 text-center">
              <span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-400">
                <Bike className="size-5" />
              </span>
              <p className="mt-3 text-sm font-bold text-slate-700">
                Ninguém em rota
              </p>
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto p-3 lg:block lg:max-h-[440px] lg:space-y-2 lg:overflow-y-auto">
              {motoristas.map((motorista) => {
                const possuiLocalizacao =
                  motorista.latitude !== null &&
                  motorista.longitude !== null;
                const selecionado =
                  motorista.motoboyId === selecionadoEfetivoId;

                return (
                  <button
                    key={motorista.motoboyId}
                    type="button"
                    onClick={() => setSelecionadoId(motorista.motoboyId)}
                    className={`min-w-[240px] rounded-2xl border px-3 py-3 text-left transition lg:min-w-0 lg:w-full ${
                      selecionado
                        ? "border-[#0A1F44]/25 bg-[#F3F6FA] shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`grid size-10 shrink-0 place-items-center rounded-full text-[11px] font-black text-white ${
                          selecionado ? "bg-[#0A1F44]" : "bg-slate-500"
                        }`}
                      >
                        {iniciais(motorista.nome)}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {motorista.nome}
                          </p>
                          <span
                            className={`size-2 shrink-0 rounded-full ${
                              possuiLocalizacao
                                ? "bg-emerald-500"
                                : "bg-slate-300"
                            }`}
                            aria-label={
                              possuiLocalizacao
                                ? "Localização disponível"
                                : "Sem localização"
                            }
                          />
                        </div>

                        <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
                          {motorista.entregas.length}{" "}
                          {motorista.entregas.length === 1
                            ? "entrega"
                            : "entregas"}{" "}
                          · {resumoEntregas(motorista)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-2.5">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${
                          possuiLocalizacao
                            ? "text-emerald-700"
                            : "text-slate-400"
                        }`}
                      >
                        {possuiLocalizacao ? (
                          <Navigation className="size-3.5" />
                        ) : (
                          <MapPin className="size-3.5" />
                        )}
                        {possuiLocalizacao ? "Localizado" : "Sem sinal"}
                      </span>

                      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-slate-400">
                        <Clock3 className="size-3.5" />
                        {formatarAtualizacao(
                          motorista.localizacaoAtualizadaEm
                        )}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <div className="relative h-[340px] lg:h-[440px]">
          <MotoboyMap
            motoristas={motoristas}
            motoristaSelecionadoId={selecionadoEfetivoId}
            onSelecionarMotorista={setSelecionadoId}
          />

          {motoristaSelecionado && (
            <div className="pointer-events-none absolute left-3 top-3 z-[500] max-w-[calc(100%-1.5rem)] rounded-2xl border border-white/80 bg-white/95 px-3.5 py-2.5 shadow-lg backdrop-blur">
              <p className="truncate text-xs font-black text-[#0A1F44]">
                {motoristaSelecionado.nome}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                {motoristaSelecionado.entregas.length}{" "}
                {motoristaSelecionado.entregas.length === 1
                  ? "entrega em rota"
                  : "entregas em rota"}
              </p>
            </div>
          )}

          {motoristas.length === 0 && (
            <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[500] rounded-xl border border-slate-200 bg-white/95 px-4 py-3 text-center text-xs font-semibold text-slate-600 shadow-sm">
              Nenhum motorista em rota no momento.
            </div>
          )}

          {motoristas.length > 0 && comLocalizacao === 0 && (
            <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[500] rounded-xl border border-slate-200 bg-white/95 px-4 py-3 text-center text-xs font-semibold text-slate-600 shadow-sm">
              Nenhuma localização compartilhada.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
