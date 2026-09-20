"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Bike,
  Clock3,
  MapPin,
  Navigation,
  Radio,
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

  if (numeros.length <= 2) return numeros.join(", ");

  return `${numeros.slice(0, 2).join(", ")} +${numeros.length - 2}`;
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
  const semLocalizacao = motoristas.length - comLocalizacao;
  const primeiroComLocalizacao = motoristas.find(
    (motorista) =>
      motorista.latitude !== null && motorista.longitude !== null
  );
  const selecionadoEfetivoId =
    selecionadoId &&
    motoristas.some((motorista) => motorista.motoboyId === selecionadoId)
      ? selecionadoId
      : primeiroComLocalizacao?.motoboyId ?? motoristas[0]?.motoboyId ?? null;

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center bg-[#0A1F44] text-white">
              <Bike className="size-4.5" />
            </span>
            <div>
              <h2 className="text-[17px] font-bold text-[#0A1F44]">
                Motoristas em rota
              </h2>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 px-1 py-1.5 text-xs font-bold text-amber-700"
            style={{ background: "transparent", border: 0, boxShadow: "none" }}
          >
            <Radio className="size-3.5" />
            {motoristas.length} em rota
          </span>
          <span
            className="inline-flex items-center gap-1.5 px-1 py-1.5 text-xs font-bold text-emerald-700"
            style={{ background: "transparent", border: 0, boxShadow: "none" }}
          >
            <MapPin className="size-3.5" />
            {comLocalizacao} com localização
          </span>
          {semLocalizacao > 0 && (
            <span
              className="inline-flex items-center px-1 py-1.5 text-xs font-bold text-slate-600"
              style={{ background: "transparent", border: 0, boxShadow: "none" }}
            >
              {semLocalizacao} sem localização
            </span>
          )}
        </div>
      </div>

      <div className="grid min-h-[420px] lg:grid-cols-[310px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-slate-50/70 lg:border-r lg:border-b-0">
          <div className="border-b border-slate-200 bg-white px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
              Motoristas
            </p>
          </div>

          {motoristas.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center px-5 py-8 text-center">
              <span className="grid size-10 place-items-center bg-slate-100 text-slate-400">
                <Bike className="size-5" />
              </span>
              <p className="mt-3 text-sm font-bold text-slate-700">
                Ninguém em rota
              </p>
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto p-2">
              {motoristas.map((motorista) => {
                const possuiLocalizacao =
                  motorista.latitude !== null &&
                  motorista.longitude !== null;
                const selecionado = motorista.motoboyId === selecionadoEfetivoId;

                return (
                  <button
                    key={motorista.motoboyId}
                    type="button"
                    onClick={() => setSelecionadoId(motorista.motoboyId)}
                    className={`mb-2 w-full border bg-white p-3 text-left transition-[border-color,background-color,transform] last:mb-0 hover:border-[#0A1F44]/30 active:scale-[0.99] ${
                      selecionado
                        ? "border-[#0A1F44] shadow-sm"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-black text-white ${
                              selecionado ? "bg-[#0A1F44]" : "bg-amber-500"
                            }`}
                          >
                            {motorista.nome
                              .split(/\s+/)
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((parte) => parte[0]?.toUpperCase())
                              .join("") || "M"}
                          </span>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">
                              {motorista.nome}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
                              {resumoEntregas(motorista) || "Entrega em rota"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`mt-1 size-2.5 shrink-0 rounded-full ${
                          possuiLocalizacao
                            ? "bg-emerald-500"
                            : "bg-slate-300"
                        }`}
                        title={
                          possuiLocalizacao
                            ? "Localização disponível"
                            : "Sem localização"
                        }
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-2.5">
                      <span
                        className={`inline-flex min-w-0 items-center gap-1.5 text-[11px] font-semibold ${
                          possuiLocalizacao
                            ? "text-emerald-700"
                            : "text-slate-400"
                        }`}
                      >
                        {possuiLocalizacao ? (
                          <Navigation className="size-3.5 shrink-0" />
                        ) : (
                          <MapPin className="size-3.5 shrink-0" />
                        )}
                        <span className="truncate">
                          {possuiLocalizacao
                            ? "Localização disponível"
                            : "Sem localização compartilhada"}
                        </span>
                      </span>

                      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-slate-400">
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

        <div className="relative min-h-[360px] lg:min-h-[420px]">
          <MotoboyMap
            motoristas={motoristas}
            motoristaSelecionadoId={selecionadoEfetivoId}
            onSelecionarMotorista={setSelecionadoId}
          />

          {motoristas.length === 0 && (
            <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[500] border border-slate-200 bg-white/95 px-4 py-3 text-center text-xs font-semibold text-slate-600 shadow-sm">
              Nenhum motorista em rota no momento.
            </div>
          )}

          {motoristas.length > 0 && comLocalizacao === 0 && (
            <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[500] border border-slate-200 bg-white/95 px-4 py-3 text-center text-xs font-semibold text-slate-600 shadow-sm">
              Há motoristas em rota, mas nenhuma localização foi compartilhada ainda.
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-6 py-3 text-[11px] text-slate-500">
        <span>
          Clique em um motorista para localizá-lo no mapa.
        </span>
      </div>
    </Card>
  );
}
