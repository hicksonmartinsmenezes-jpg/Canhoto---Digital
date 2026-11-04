"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  Ban,
  Eye,
  Loader2,
  MoreVertical,
  SquarePen,
  Trash2,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { excluirEntrega } from "@/app/canhotos/actions";
import { CancelarEntregaDialog } from "@/components/canhotos/CancelarEntregaDialog";
import type { StatusEntrega } from "@/types/database";

interface EntregaRowActionsProps {
  id: string;
  numero: string;
  cliente: string;
  status: StatusEntrega;
  /** Pendente e ainda sem saída: única situação em que excluir é permitido. */
  aindaNaLoja: boolean;
  /** Só o Admin exclui (gestor de setor cancela). */
  podeExcluir?: boolean;
  /** Celular: só o botão "⋮", com Editar dentro do menu. */
  compacto?: boolean;
}

const ICONE =
  "rounded-lg border border-slate-200 p-1.5 text-slate-500 transition-[transform,color,border-color] duration-150 active:scale-90";
const ITEM_MENU =
  "flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm font-semibold transition-colors";

export function EntregaRowActions({
  id,
  numero,
  cliente,
  status,
  aindaNaLoja,
  podeExcluir = true,
  compacto = false,
}: EntregaRowActionsProps) {
  const router = useRouter();
  const botaoRef = useRef<HTMLButtonElement>(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [posicaoMenu, setPosicaoMenu] = useState<{ top: number; right: number } | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const mostrarCancelar = status === "pendente";
  const mostrarExcluir = podeExcluir && aindaNaLoja;
  const temMenu = compacto || mostrarCancelar || mostrarExcluir;

  useEffect(() => {
    if (!menuAberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuAberto(false);
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [menuAberto]);

  // O menu é renderizado via portal (fora da tabela com scroll horizontal):
  // dentro do container "overflow-x-auto" da CanhotosTable, um elemento
  // position:absolute que ultrapassa a borda da tabela fica cortado (o
  // navegador computa overflow-y:auto junto quando só overflow-x é
  // definido). Calculamos a posição em viewport (position:fixed) a partir
  // do botão e fechamos ao rolar/redimensionar em vez de reposicionar —
  // o menu é efêmero, não vale a complexidade de acompanhar o scroll.
  useEffect(() => {
    if (!menuAberto) return;
    const botao = botaoRef.current;
    if (!botao) return;
    const rect = botao.getBoundingClientRect();
    setPosicaoMenu({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
    const fechar = () => setMenuAberto(false);
    window.addEventListener("scroll", fechar, true);
    window.addEventListener("resize", fechar);
    return () => {
      window.removeEventListener("scroll", fechar, true);
      window.removeEventListener("resize", fechar);
    };
  }, [menuAberto]);

  function excluir() {
    setErro(null);
    startTransition(async () => {
      const resultado = await excluirEntrega(id);
      if (!resultado.ok) {
        setErro(resultado.error ?? "Não foi possível excluir a entrega.");
        return;
      }
      setConfirmandoExclusao(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="relative flex items-center gap-2">
        {!compacto && (
          <>
            <Link
              href={`/canhotos/${id}`}
              prefetch={false}
              aria-label={`Ver entrega ${numero}`}
              title="Ver entrega e comprovantes"
              className={`${ICONE} hover:border-[#0A1F44]/30 hover:text-[#0A1F44]`}
            >
              <Eye className="size-4" />
            </Link>
            <Link
              href={`/canhotos/${id}/editar`}
              prefetch={false}
              aria-label={`Editar entrega ${numero}`}
              title="Editar entrega"
              className={`${ICONE} hover:border-amber-500/40 hover:text-amber-600`}
            >
              <SquarePen className="size-4" />
            </Link>
          </>
        )}
        {temMenu && (
          <button
            ref={botaoRef}
            type="button"
            aria-label={`Mais ações da entrega ${numero}`}
            aria-haspopup="menu"
            aria-expanded={menuAberto}
            title="Mais ações"
            onClick={() => setMenuAberto((v) => !v)}
            className={`${ICONE} ${compacto ? "p-2.5" : ""} hover:border-amber-500/40 hover:text-amber-600`}
          >
            <MoreVertical className="size-4" />
          </button>
        )}
      </div>
      {menuAberto &&
        posicaoMenu &&
        createPortal(
          <AnimatePresence>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuAberto(false)}
            />
            <motion.div
              role="menu"
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -2 }}
              transition={{ type: "spring", duration: 0.25, bounce: 0 }}
              style={{
                transformOrigin: "top right",
                position: "fixed",
                top: posicaoMenu.top,
                right: posicaoMenu.right,
              }}
              className="z-50 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
            >
              {compacto && (
                <Link
                  role="menuitem"
                  href={`/canhotos/${id}/editar`}
                  prefetch={false}
                  className={`${ITEM_MENU} text-slate-700 hover:bg-slate-50`}
                >
                  <SquarePen className="size-4" />
                  Editar
                </Link>
              )}
              {mostrarCancelar && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuAberto(false);
                    setCancelando(true);
                  }}
                  className={`${ITEM_MENU} text-amber-700 hover:bg-amber-50`}
                >
                  <Ban className="size-4" />
                  Cancelar entrega
                </button>
              )}
              {mostrarExcluir && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuAberto(false);
                    setErro(null);
                    setConfirmandoExclusao(true);
                  }}
                  className={`${ITEM_MENU} text-red-600 hover:bg-red-50`}
                >
                  <Trash2 className="size-4" />
                  Excluir
                </button>
              )}
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}

      <AnimatePresence>
        {cancelando && (
          <CancelarEntregaDialog
            id={id}
            numero={numero}
            cliente={cliente}
            onClose={() => setCancelando(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmandoExclusao && (
          <Modal onClose={() => !pending && setConfirmandoExclusao(false)}>
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-[15px] font-bold">Excluir entrega {numero}?</h3>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setConfirmandoExclusao(false)}
                className="text-slate-400 transition-colors hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="text-sm text-slate-500">
              Cliente <span className="font-semibold text-slate-700">{cliente}</span>.
              A entrega some do sistema. Prefere só cancelar? Use Cancelar entrega.
            </p>
            {erro && (
              <div
                role="alert"
                className="mt-4 rounded-xl border border-red-200 px-3.5 py-2.5 text-xs font-semibold text-red-700"
              >
                {erro}
              </div>
            )}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmandoExclusao(false)}
                className="text-sm font-bold text-slate-500 hover:text-slate-700"
              >
                Voltar
              </button>
              <button
                type="button"
                disabled={pending || Boolean(erro)}
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
        )}
      </AnimatePresence>
    </>
  );
}
