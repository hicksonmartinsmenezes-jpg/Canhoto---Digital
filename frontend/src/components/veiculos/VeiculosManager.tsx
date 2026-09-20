"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import {
  Banknote,
  Car,
  CircleDollarSign,
  Fuel,
  Loader2,
  Plus,
  ReceiptText,
  SquarePen,
  Trash2,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import {
  atualizarVeiculo,
  criarVeiculo,
  excluirGastoVeiculo,
  registrarGastoVeiculo,
  type GastoVeiculoInput,
  type VeiculoActionResult,
  type VeiculoInput,
} from "@/app/veiculos/actions";
import {
  TIPO_GASTO_VEICULO_LABEL,
  type TipoGastoVeiculo,
  type VeiculoGastoItem,
  type VeiculoListItem,
  type VeiculosData,
} from "@/lib/data/veiculos";

type ModalState =
  | { tipo: "novo-veiculo" }
  | { tipo: "editar-veiculo"; veiculo: VeiculoListItem }
  | { tipo: "novo-gasto"; veiculoId?: string }
  | { tipo: "excluir-gasto"; gasto: VeiculoGastoItem }
  | null;

const TIPOS_GASTO = Object.entries(TIPO_GASTO_VEICULO_LABEL) as Array<
  [TipoGastoVeiculo, string]
>;

function dataHojeInput(): string {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

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
          <h1 className="text-2xl font-bold tracking-tight text-[#0A1F44]">
            Gestão de Veículos
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Controle da frota e dos gastos operacionais.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setModal({ tipo: "novo-gasto" })}
            disabled={data.veiculos.length === 0}
            className="inline-flex items-center gap-2 bg-[#0A1F44] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#102b5d] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ReceiptText className="size-4" />
            Registrar gasto
          </button>

          <button
            type="button"
            onClick={() => setModal({ tipo: "novo-veiculo" })}
            className="inline-flex items-center gap-2 bg-linear-to-r from-[#F2B22E] to-[#DE6C09] px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-95"
          >
            <Plus className="size-4" strokeWidth={2.5} />
            Novo veículo
          </button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ResumoCard
          label="Veículos ativos"
          value={String(data.resumo.ativos)}
          icon={Car}
          tone="navy"
        />
        <ResumoCard
          label="Gasto no mês"
          value={data.resumo.totalMes}
          icon={CircleDollarSign}
          tone="accent"
        />
        <ResumoCard
          label="Combustível"
          value={data.resumo.combustivelMes}
          icon={Fuel}
          tone="neutral"
        />
        <ResumoCard
          label="Manutenção"
          value={data.resumo.manutencaoMes}
          icon={Wrench}
          tone="neutral"
        />
      </div>

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-[15px] font-bold text-[#0A1F44]">
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
                description="Cadastre o primeiro veículo para começar a controlar os gastos da frota."
                action={{
                  label: "Novo veículo",
                  onClick: () => setModal({ tipo: "novo-veiculo" }),
                }}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
                      <th className="px-6 py-3.5 font-bold">Veículo</th>
                      <th className="px-6 py-3.5 font-bold">Placa</th>
                      <th className="px-6 py-3.5 font-bold">Ano</th>
                      <th className="px-6 py-3.5 font-bold">Gasto no mês</th>
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
                        <td className="px-6 py-4 font-mono font-semibold tracking-wide text-slate-600">
                          {veiculo.placa}
                        </td>
                        <td className="px-6 py-4 tabular-nums text-slate-500">
                          {veiculo.ano ?? "—"}
                        </td>
                        <td className="px-6 py-4 font-semibold tabular-nums text-slate-700">
                          {veiculo.gastoMes}
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
                              aria-label="Registrar gasto"
                              title="Registrar gasto"
                              onClick={() =>
                                setModal({
                                  tipo: "novo-gasto",
                                  veiculoId: veiculo.id,
                                })
                              }
                              className="border border-slate-200 p-1.5 text-slate-500 transition hover:border-[#DE6C09]/40 hover:text-[#DE6C09]"
                            >
                              <Banknote className="size-4" />
                            </button>
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

        <div className="col-span-12">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-[15px] font-bold text-[#0A1F44]">
                Gastos recentes
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Últimos lançamentos registrados na frota.
              </p>
            </div>

            {data.gastosRecentes.length === 0 ? (
              <EmptyState
                icon={ReceiptText}
                title="Nenhum gasto registrado"
                description="Os gastos de combustível, manutenção, multas e outros aparecerão aqui."
                action={
                  data.veiculos.length > 0
                    ? {
                        label: "Registrar gasto",
                        onClick: () => setModal({ tipo: "novo-gasto" }),
                      }
                    : undefined
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
                      <th className="px-6 py-3.5 font-bold">Data</th>
                      <th className="px-6 py-3.5 font-bold">Veículo</th>
                      <th className="px-6 py-3.5 font-bold">Categoria</th>
                      <th className="px-6 py-3.5 font-bold">Km</th>
                      <th className="px-6 py-3.5 font-bold">Observação</th>
                      <th className="px-6 py-3.5 text-right font-bold">Valor</th>
                      <th className="px-6 py-3.5 font-bold">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.gastosRecentes.map((gasto) => (
                      <tr
                        key={gasto.id}
                        className="border-b border-slate-100 text-sm last:border-b-0 hover:bg-slate-50/70"
                      >
                        <td className="px-6 py-4 tabular-nums text-slate-500">
                          {gasto.data}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-800">
                            {gasto.veiculo}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-slate-400">
                            {gasto.placa}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex bg-[#0A1F44]/10 px-2.5 py-1 text-xs font-semibold text-[#0A1F44]">
                            {TIPO_GASTO_VEICULO_LABEL[gasto.tipo]}
                          </span>
                        </td>
                        <td className="px-6 py-4 tabular-nums text-slate-500">
                          {gasto.quilometragem === null
                            ? "—"
                            : `${gasto.quilometragem.toLocaleString("pt-BR")} km`}
                        </td>
                        <td className="max-w-[260px] px-6 py-4 text-slate-500">
                          <span className="line-clamp-2">
                            {gasto.observacao || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold tabular-nums text-slate-800">
                          {gasto.valor}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            aria-label="Excluir gasto"
                            title="Excluir gasto"
                            onClick={() =>
                              setModal({ tipo: "excluir-gasto", gasto })
                            }
                            className="border border-slate-200 p-1.5 text-slate-400 transition hover:border-red-300 hover:text-red-600"
                          >
                            <Trash2 className="size-4" />
                          </button>
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

        {modal?.tipo === "novo-gasto" && (
          <GastoFormModal
            key="novo-gasto"
            veiculos={data.veiculos}
            veiculoIdInicial={modal.veiculoId}
            onClose={() => setModal(null)}
            onSuccess={fecharEAtualizar}
          />
        )}

        {modal?.tipo === "excluir-gasto" && (
          <ExcluirGastoModal
            key="excluir-gasto"
            gasto={modal.gasto}
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
    <Card
      className={`p-5 ${
        tone === "accent"
          ? "border-transparent! bg-linear-to-br from-[#F2B22E] to-[#DE6C09] text-white"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={`text-[11px] font-bold uppercase tracking-wide ${
              tone === "accent" ? "text-white/85" : "text-slate-400"
            }`}
          >
            {label}
          </p>
          <p
            className={`mt-2 text-2xl font-black tracking-tight ${
              tone === "accent" ? "text-white" : "text-[#0A1F44]"
            }`}
          >
            {value}
          </p>
        </div>
        <span
          className={`grid size-10 place-items-center ${
            tone === "accent"
              ? "bg-white/15 text-white"
              : tone === "navy"
                ? "bg-[#0A1F44]/8 text-[#0A1F44]"
                : "bg-slate-100 text-slate-500"
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

function GastoFormModal({
  veiculos,
  veiculoIdInicial,
  onClose,
  onSuccess,
}: {
  veiculos: VeiculoListItem[];
  veiculoIdInicial?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const primeiroAtivo = veiculos.find((veiculo) => veiculo.ativo);
  const [veiculoId, setVeiculoId] = useState(
    veiculoIdInicial ?? primeiroAtivo?.id ?? veiculos[0]?.id ?? ""
  );
  const [tipo, setTipo] = useState<TipoGastoVeiculo>("combustivel");
  const [data, setData] = useState(dataHojeInput());
  const [valor, setValor] = useState("");
  const [quilometragem, setQuilometragem] = useState("");
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function salvar() {
    const input: GastoVeiculoInput = {
      veiculoId,
      tipo,
      data,
      valor: Number(valor),
      quilometragem: quilometragem.trim()
        ? Number(quilometragem)
        : null,
      observacao,
    };

    setErro(null);
    startTransition(async () => {
      const resultado = await registrarGastoVeiculo(input);

      if (!resultado.ok) {
        setErro(resultado.error ?? "Não foi possível registrar o gasto.");
        return;
      }

      onSuccess();
    });
  }

  return (
    <Modal onClose={onClose} size="lg">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-[#0A1F44]">
            Registrar gasto
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Lance uma despesa vinculada a um veículo.
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
        <Campo label="Veículo">
          <select
            value={veiculoId}
            onChange={(event) => setVeiculoId(event.target.value)}
            className={inputClass}
          >
            {veiculos.map((veiculo) => (
              <option key={veiculo.id} value={veiculo.id}>
                {veiculo.placa} · {veiculo.marca} {veiculo.modelo}
                {veiculo.ativo ? "" : " (inativo)"}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Categoria">
          <select
            value={tipo}
            onChange={(event) =>
              setTipo(event.target.value as TipoGastoVeiculo)
            }
            className={inputClass}
          >
            {TIPOS_GASTO.map(([valorTipo, label]) => (
              <option key={valorTipo} value={valorTipo}>
                {label}
              </option>
            ))}
          </select>
        </Campo>

        <Campo label="Data">
          <input
            type="date"
            value={data}
            onChange={(event) => setData(event.target.value)}
            className={inputClass}
          />
        </Campo>

        <Campo label="Valor">
          <input
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={valor}
            placeholder="0,00"
            onChange={(event) => setValor(event.target.value)}
            className={inputClass}
          />
        </Campo>

        <Campo label="Quilometragem" opcional>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            step="1"
            value={quilometragem}
            placeholder="Ex.: 48520"
            onChange={(event) => setQuilometragem(event.target.value)}
            className={inputClass}
          />
        </Campo>

        <div className="sm:col-span-2">
          <Campo label="Observação" opcional>
            <textarea
              rows={3}
              value={observacao}
              placeholder="Ex.: troca de óleo e filtro, posto abastecido, motivo da multa..."
              onChange={(event) => setObservacao(event.target.value)}
              className={inputClass}
            />
          </Campo>
        </div>
      </div>

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
          className="inline-flex items-center gap-2 bg-linear-to-r from-[#F2B22E] to-[#DE6C09] px-4 py-2.5 text-sm font-bold text-white hover:brightness-95 disabled:opacity-60"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Registrar gasto
        </button>
      </div>
    </Modal>
  );
}

function ExcluirGastoModal({
  gasto,
  onClose,
  onSuccess,
}: {
  gasto: VeiculoGastoItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function excluir() {
    setErro(null);
    startTransition(async () => {
      const resultado = await excluirGastoVeiculo(gasto.id);
      if (!resultado.ok) {
        setErro(resultado.error ?? "Não foi possível excluir o gasto.");
        return;
      }
      onSuccess();
    });
  }

  return (
    <Modal onClose={onClose}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Excluir lançamento?
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {gasto.placa} · {TIPO_GASTO_VEICULO_LABEL[gasto.tipo]} ·{" "}
            {gasto.valor}
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

      <p className="text-sm leading-6 text-slate-600">
        Use esta ação apenas para corrigir um lançamento feito por engano.
        A exclusão não pode ser desfeita.
      </p>

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
          onClick={excluir}
          className="inline-flex items-center gap-2 bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Excluir gasto
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
