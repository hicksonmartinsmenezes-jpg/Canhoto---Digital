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
        {colaboradores.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum colaborador cadastrado ainda"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3.5 font-bold">Usuário</th>
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
                    <td className="px-6 py-4 font-semibold">
                      {c.usuario ?? c.nome}
                      {c.usuario === null && (
                        <p className="mt-0.5 text-xs font-normal text-slate-400">
                          Sem usuário definido
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {PAPEL_LABEL[c.papel]}
                      {c.papel === "gestor_setor" && (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {c.usuario !== null && c.temSenha
                            ? "Login ativo"
                            : "Sem acesso ao login"}
                        </p>
                      )}
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
              usuario: "",
              // "Colaborador" (sem login) foi removido: todo cadastro feito
              // por aqui agora é Gestor de setor.
              papel: "gestor_setor",
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
              usuario: modal.colaborador.usuario ?? "",
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
  const [usuario, setUsuario] = useState(dadosIniciais.usuario);
  const [ativo, setAtivo] = useState(dadosIniciais.ativo);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Papel não é mais escolhido no formulário: "Colaborador" (sem login) foi
  // removido, já que "Gestor de setor" cobre o caso de uso. Um colaborador
  // já existente com papel "admin" (legado) mantém o papel ao ser editado
  // em vez de ser rebaixado sem querer.
  const papel: PapelColaborador =
    dadosIniciais.papel === "admin" ? "admin" : "gestor_setor";
  const ehGestorDeSetor = papel === "gestor_setor";
  // Só true na criação (mostrarAtivo é o mesmo flag que já diferencia
  // Novo/Editar no componente pai) — na criação de um gestor_setor, a
  // senha é obrigatória; na edição, campo vazio mantém a senha atual.
  const senhaObrigatoria = ehGestorDeSetor && !mostrarAtivo;

  function salvar() {
    if (!usuario.trim()) {
      setErro("Informe o usuário.");
      return;
    }
    if (senhaObrigatoria && !senha.trim()) {
      setErro("Defina uma senha.");
      return;
    }
    if (senha.trim() && senha.trim().length < 4) {
      setErro("A senha deve ter pelo menos 4 caracteres.");
      return;
    }
    setErro(null);
    startTransition(async () => {
      const resultado = await onSalvar({
        usuario,
        papel,
        ativo,
        senha: ehGestorDeSetor ? senha : undefined,
      });
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
        Usuário
      </label>
      <input
        type="text"
        autoFocus
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        value={usuario}
        onChange={(e) => setUsuario(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-400/15"
      />

      {ehGestorDeSetor && (
        <>
          <label className="mb-1.5 mt-4 block text-xs font-bold uppercase tracking-wide text-slate-500">
            Senha
            {mostrarAtivo && (
              <span className="ml-1 font-medium normal-case text-slate-400">
                (deixe em branco pra manter a senha atual)
              </span>
            )}
          </label>
          <input
            type="password"
            autoComplete="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-400/15"
          />
        </>
      )}

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
        <div className="mt-4 rounded-xl border border-red-200 px-3.5 py-2.5 text-xs font-semibold text-red-700">
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
        <div className="mt-4 rounded-xl border border-red-200 px-3.5 py-2.5 text-xs font-semibold text-red-700">
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
