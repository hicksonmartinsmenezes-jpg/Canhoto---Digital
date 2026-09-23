"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import {
  Car,
  Loader2,
  Plus,
  SquarePen,
  X,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import {
  atualizarVeiculo,
  criarVeiculo,
  type VeiculoActionResult,
  type VeiculoInput,
} from "@/app/veiculos/actions";
import {
  type VeiculoListItem,
  type VeiculosData,
} from "@/lib/veiculos";

type ModalState =
  | { tipo: "novo-veiculo" }
  | { tipo: "editar-veiculo"; veiculo: VeiculoListItem }
  | null;

function normalizarPlacaInput(valor: string): string {
  return valor
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 8);
}

export function VeiculosManager({ data }: { data: VeiculosData }) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalState>(null);

  function fecharEAtualizar() {
    setModal(null);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Gestão de Veículos
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setModal({ tipo: "novo-veiculo" })}
            className="inline-flex items-center gap-1.5 bg-amber-500 px-5 py-2.5 text-sm font-bold text-white transition-[transform,background-color] duration-150 hover:bg-amber-400 active:scale-[0.97]"
          >
            <Plus className="size-4" strokeWidth={2.5} />
            Novo veículo
          </button>
        </div>
      </div>

      <div className="mb-5 max-w-sm">
        <ResumoCard
          label="Veículos ativos"
          value={String(data.resumo.ativos)}
          icon={Car}
          tone="navy"
        />
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-[15px] font-bold">
                  Veículos cadastrados
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {data.veiculos.length} veículo
                  {data.veiculos.length === 1 ? "" : "s"} na frota.
                </p>
              </div>
            </div>

            {data.veiculos.length === 0 ? (
              <EmptyState
                icon={Car}
                title="Nenhum veículo cadastrado"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
                      <th className="px-6 py-3.5 font-bold">Veículo</th>
                      <th className="px-6 py-3.5 font-bold">Placa</th>
                      <th className="px-6 py-3.5 font-bold">Ano</th>
                      <th className="px-6 py-3.5 font-bold">Status</th>
                      <th className="px-6 py-3.5 font-bold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.veiculos.map((veiculo) => (
                      <tr
                        key={veiculo.id}
                        className="border-b border-slate-100 text-sm transition-colors last:border-b-0 hover:bg-slate-50/70"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="grid size-9 shrink-0 place-items-center bg-[#0A1F44]/8 text-[#0A1F44]">
                              <Car className="size-4.5" />
                            </span>
                            <div>
                              <p className="font-semibold text-slate-800">
                                {veiculo.marca} {veiculo.modelo}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-400">
                                ID {veiculo.id.slice(0, 8)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium tabular-nums text-slate-500">
                          {veiculo.placa}
                        </td>
                        <td className="px-6 py-4 tabular-nums text-slate-500">
                          {veiculo.ano ?? "—"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex border px-2.5 py-1 text-xs font-semibold ${
                              veiculo.ativo
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-slate-50 text-slate-500"
                            }`}
                          >
                            {veiculo.ativo ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              aria-label="Editar veículo"
                              title="Editar veículo"
                              onClick={() =>
                                setModal({
                                  tipo: "editar-veiculo",
                                  veiculo,
                                })
                              }
                              className="border border-slate-200 p-1.5 text-slate-500 transition hover:border-[#0A1F44]/30 hover:text-[#0A1F44]"
                            >
                              <SquarePen className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

      </div>

      <AnimatePresence>
        {modal?.tipo === "novo-veiculo" && (
          <VeiculoFormModal
            key="novo-veiculo"
            titulo="Novo veículo"
            veiculo={null}
            onClose={() => setModal(null)}
            onSuccess={fecharEAtualizar}
          />
        )}

        {modal?.tipo === "editar-veiculo" && (
          <VeiculoFormModal
            key="editar-veiculo"
            titulo="Editar veículo"
            veiculo={modal.veiculo}
            onClose={() => setModal(null)}
            onSuccess={fecharEAtualizar}
          />
        )}

      </AnimatePresence>
    </div>
  );
}

function ResumoCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: "navy" | "accent" | "neutral";
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wide text-[#64748B]">
            {label}
          </p>
          <p className="mt-3 text-[36px] font-bold leading-none tracking-tight text-[#0F172A]">
            {value}
          </p>
        </div>
        <span
          className={`grid size-10 place-items-center ${
            tone === "navy" ? "text-[#0A1F44]" : "text-slate-500"
          }`}
        >
          <Icon className="size-5" />
        </span>
      </div>
    </Card>
  );
}

function VeiculoFormModal({
  titulo,
  veiculo,
  onClose,
  onSuccess,
}: {
  titulo: string;
  veiculo: VeiculoListItem | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [placa, setPlaca] = useState(veiculo?.placa ?? "");
  const [marca, setMarca] = useState(veiculo?.marca ?? "");
  const [modelo, setModelo] = useState(veiculo?.modelo ?? "");
  const [ano, setAno] = useState(veiculo?.ano ? String(veiculo.ano) : "");
  const [ativo, setAtivo] = useState(veiculo?.ativo ?? true);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function salvar() {
    const anoNumero = ano.trim() ? Number(ano) : null;
    const input: VeiculoInput = {
      placa,
      marca,
      modelo,
      ano: anoNumero,
      ativo,
    };

    setErro(null);
    startTransition(async () => {
      const resultado: VeiculoActionResult = veiculo
        ? await atualizarVeiculo(veiculo.id, input)
        : await criarVeiculo(input);

      if (!resultado.ok) {
        setErro(resultado.error ?? "Não foi possível salvar o veículo.");
        return;
      }

      onSuccess();
    });
  }

  return (
    <Modal onClose={onClose} size="lg">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-[#0A1F44]">{titulo}</h3>
          <p className="mt-1 text-xs text-slate-500">
            Identificação básica do veículo da frota.
          </p>
        </div>
        <button
          type="button"
          aria-label="Fechar"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo label="Placa">
          <input
            autoFocus
            type="text"
            value={placa}
            maxLength={8}
            placeholder="ABC1D23"
            onChange={(event) =>
              setPlaca(normalizarPlacaInput(event.target.value))
            }
            className={inputClass}
          />
        </Campo>

        <Campo label="Ano" opcional>
          <input
            type="number"
            min={1950}
            max={2100}
            value={ano}
            placeholder="2024"
            onChange={(event) => setAno(event.target.value)}
            className={inputClass}
          />
        </Campo>

        <Campo label="Marca">
          <input
            type="text"
            value={marca}
            placeholder="Fiat"
            onChange={(event) => setMarca(event.target.value)}
            className={inputClass}
          />
        </Campo>

        <Campo label="Modelo">
          <input
            type="text"
            value={modelo}
            placeholder="Fiorino"
            onChange={(event) => setModelo(event.target.value)}
            className={inputClass}
          />
        </Campo>
      </div>

      {veiculo && (
        <label className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-600">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(event) => setAtivo(event.target.checked)}
            className="size-4 border-slate-300 text-[#0A1F44]"
          />
          Veículo ativo
        </label>
      )}

      {erro && <Erro mensagem={erro} />}

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={salvar}
          className="inline-flex items-center gap-2 bg-[#0A1F44] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#102b5d] disabled:opacity-60"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Salvar veículo
        </button>
      </div>
    </Modal>
  );
}

const inputClass =
  "w-full border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0A1F44] focus:ring-2 focus:ring-[#0A1F44]/10";

function Campo({
  label,
  opcional = false,
  children,
}: {
  label: string;
  opcional?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
        {opcional && (
          <span className="ml-1 font-medium normal-case text-slate-400">
            (opcional)
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

function Erro({ mensagem }: { mensagem: string }) {
  return (
    <div className="mt-4 border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">
      {mensagem}
    </div>
  );
}
