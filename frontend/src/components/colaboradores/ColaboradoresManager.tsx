"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { Plus, SquarePen, Trash2, X, Loader2, Check, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  criarColaborador,
  atualizarColaborador,
  excluirColaborador,
  type ColaboradorActionResult,
  type ColaboradorDados,
} from "@/app/colaboradores/actions";
import { PAPEL_LABEL } from "@/lib/colaboradores-labels";
import type { ColaboradorListItem } from "@/lib/data/colaboradores";
import type { PapelColaborador } from "@/types/database";

interface ColaboradoresManagerProps {
  colaboradores: ColaboradorListItem[];
}

type ModalState =
  | { tipo: "novo" }
  | { tipo: "editar"; colaborador: ColaboradorListItem }
  | { tipo: "excluir"; colaborador: ColaboradorListItem }
  | null;

export function ColaboradoresManager({ colaboradores }: ColaboradoresManagerProps) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalState>(null);

  function fecharErecarregar() {
    setModal(null);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Colaboradores</h1>
        </div>
        <button
          onClick={() => setModal({ tipo: "novo" })}
          className="inline-flex items-center gap-1.5 bg-amber-500 px-5 py-2.5 text-sm font-bold text-white transition-[transform,background-color] duration-150 hover:bg-amber-400 active:scale-[0.97]"
        >
          <Plus className="size-4" strokeWidth={2.5} />
          Novo Colaborador
        </button>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-[15px] font-bold">
            {colaboradores.length} colaboradores cadastrados
          </h2>
        </div>

        {colaboradores.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum colaborador cadastrado ainda"
            description="Cadastre o primeiro colaborador da empresa pra dar acesso e organizar por setor."
            action={{
              label: "Novo Colaborador",
              onClick: () => setModal({ tipo: "novo" }),
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3.5 font-bold">Nome</th>
                  <th className="px-6 py-3.5 font-bold">E-mail</th>
                  <th className="px-6 py-3.5 font-bold">Setor</th>
                  <th className="px-6 py-3.5 font-bold">Cargo</th>
                  <th className="px-6 py-3.5 font-bold">Papel</th>
                  <th className="px-6 py-3.5 font-bold">Status</th>
                  <th className="px-6 py-3.5 font-bold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {colaboradores.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 text-sm transition-colors last:border-b-0 hover:bg-slate-50/70"
                  >
                    <td className="px-6 py-4 font-semibold">{c.nome}</td>
                    <td className="px-6 py-4 text-slate-500">
                      {c.email ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {c.setor ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {c.cargo ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {PAPEL_LABEL[c.papel]}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${
                          c.ativo
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-50 text-slate-500"
                        }`}
                      >
                        {c.ativo ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          aria-label="Editar colaborador"
                          onClick={() => setModal({ tipo: "editar", colaborador: c })}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition-[transform,color,border-color] duration-150 hover:border-amber-500/40 hover:text-amber-600 active:scale-90"
                        >
                          <SquarePen className="size-4" />
                        </button>
                        <button
                          aria-label="Excluir colaborador"
                          onClick={() => setModal({ tipo: "excluir", colaborador: c })}
                          className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition-[transform,color,border-color] duration-150 hover:border-red-400/50 hover:text-red-600 active:scale-90"
                        >
                          <Trash2 className="size-4" />
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

      <AnimatePresence>
        {modal?.tipo === "novo" && (
          <FormModal
            key="novo"
            titulo="Novo colaborador"
            dadosIniciais={{
              nome: "",
              email: "",
              setor: "",
              cargo: "",
              papel: "colaborador",
              ativo: true,
            }}
            mostrarAtivo={false}
            onFechar={() => setModal(null)}
            onSalvar={(dados) => criarColaborador(dados)}
            onSucesso={fecharErecarregar}
          />
        )}

        {modal?.tipo === "editar" && (
          <FormModal
            key="editar"
            titulo="Editar colaborador"
            dadosIniciais={{
              nome: modal.colaborador.nome,
              email: modal.colaborador.email ?? "",
              setor: modal.colaborador.setor ?? "",
              cargo: modal.colaborador.cargo ?? "",
              papel: modal.colaborador.papel,
              ativo: modal.colaborador.ativo,
            }}
            mostrarAtivo
            onFechar={() => setModal(null)}
            onSalvar={(dados) => atualizarColaborador(modal.colaborador.id, dados)}
            onSucesso={fecharErecarregar}
          />
        )}

        {modal?.tipo === "excluir" && (
          <ExcluirModal
            key="excluir"
            colaborador={modal.colaborador}
            onFechar={() => setModal(null)}
            onSucesso={fecharErecarregar}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function FormModal({
  titulo,
  dadosIniciais,
  mostrarAtivo,
  onFechar,
  onSalvar,
  onSucesso,
}: {
  titulo: string;
  dadosIniciais: ColaboradorDados;
  mostrarAtivo: boolean;
  onFechar: () => void;
  onSalvar: (dados: ColaboradorDados) => Promise<ColaboradorActionResult>;
  onSucesso: () => void;
}) {
  const [nome, setNome] = useState(dadosIniciais.nome);
  const [email, setEmail] = useState(dadosIniciais.email);
  const [setor, setSetor] = useState(dadosIniciais.setor);
  const [cargo, setCargo] = useState(dadosIniciais.cargo);
  const [papel, setPapel] = useState<PapelColaborador>(dadosIniciais.papel);
  const [ativo, setAtivo] = useState(dadosIniciais.ativo);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function salvar() {
    if (!nome.trim()) {
      setErro("Informe o nome do colaborador.");
      return;
    }
    setErro(null);
    startTransition(async () => {
      const resultado = await onSalvar({ nome, email, setor, cargo, papel, ativo });
      if (!resultado.ok) {
        setErro(resultado.error ?? "Não foi possível salvar.");
        return;
      }
      onSucesso();
    });
  }

  return (
    <Modal onClose={onFechar}>
      <div className="mb-4 flex items-start justify-between">
        <h3 className="text-[15px] font-bold">{titulo}</h3>
        <button
          type="button"
          aria-label="Fechar"
          onClick={onFechar}
          className="text-slate-400 transition-colors hover:text-slate-600"
        >
          <X className="size-4" />
        </button>
      </div>

      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
        Nome
      </label>
      <input
        type="text"
        autoFocus
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-400/15"
      />

      <label className="mb-1.5 mt-4 block text-xs font-bold uppercase tracking-wide text-slate-500">
        E-mail
        <span className="ml-1 font-medium normal-case text-slate-400">
          (opcional)
        </span>
      </label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-400/15"
      />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Setor
          </label>
          <input
            type="text"
            value={setor}
            onChange={(e) => setSetor(e.target.value)}
            placeholder="Ex.: Expedição"
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-400/15"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Cargo
          </label>
          <input
            type="text"
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-400/15"
          />
        </div>
      </div>

      <label className="mb-1.5 mt-4 block text-xs font-bold uppercase tracking-wide text-slate-500">
        Papel
      </label>
      <select
        value={papel}
        onChange={(e) => setPapel(e.target.value as PapelColaborador)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-400/15"
      >
        {Object.entries(PAPEL_LABEL).map(([valor, rotulo]) => (
          <option key={valor} value={valor}>
            {rotulo}
          </option>
        ))}
      </select>

      {mostrarAtivo && (
        <label className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-600">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
            className="size-4 rounded border-slate-300 text-amber-500 focus:ring-slate-400/30"
          />
          Ativo
        </label>
      )}

      {erro && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">
          {erro}
        </div>
      )}

      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onFechar}
          className="text-sm font-bold text-slate-500 hover:text-slate-700"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={salvar}
          className="inline-flex items-center gap-1.5 bg-amber-500 px-4 py-2 text-sm font-bold text-white transition-[transform,background-color] duration-150 hover:bg-amber-400 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Check className="size-4" />
              Salvar
            </>
          )}
        </button>
      </div>
    </Modal>
  );
}

function ExcluirModal({
  colaborador,
  onFechar,
  onSucesso,
}: {
  colaborador: ColaboradorListItem;
  onFechar: () => void;
  onSucesso: () => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function excluir() {
    setErro(null);
    startTransition(async () => {
      const resultado = await excluirColaborador(colaborador.id);
      if (!resultado.ok) {
        setErro(resultado.error ?? "Não foi possível excluir.");
        return;
      }
      onSucesso();
    });
  }

  return (
    <Modal onClose={onFechar}>
      <div className="mb-4 flex items-start justify-between">
        <h3 className="text-[15px] font-bold">Excluir {colaborador.nome}?</h3>
        <button
          type="button"
          aria-label="Fechar"
          onClick={onFechar}
          className="text-slate-400 transition-colors hover:text-slate-600"
        >
          <X className="size-4" />
        </button>
      </div>
      <p className="text-sm text-slate-500">Essa ação não pode ser desfeita.</p>
      {erro && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">
          {erro}
        </div>
      )}
      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onFechar}
          className="text-sm font-bold text-slate-500 hover:text-slate-700"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={excluir}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition-[transform,background-color] duration-150 hover:bg-red-500 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Excluindo...
            </>
          ) : (
            "Excluir"
          )}
        </button>
      </div>
    </Modal>
  );
}
