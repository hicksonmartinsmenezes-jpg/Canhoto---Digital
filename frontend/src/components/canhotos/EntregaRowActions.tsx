"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { SquarePen, MoreVertical, Trash2, X, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { excluirEntrega } from "@/app/canhotos/actions";

interface EntregaRowActionsProps {
  id: string;
  numero: string;
  cliente: string;
}

export function EntregaRowActions({ id, numero, cliente }: EntregaRowActionsProps) {
  const router = useRouter();
  const [menuAberto, setMenuAberto] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function excluir() {
    setErro(null);
    startTransition(async () => {
      const resultado = await excluirEntrega(id);
      if (!resultado.ok) {
        setErro(resultado.error ?? "Não foi possível excluir a entrega.");
        return;
      }
      setConfirmando(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="relative flex items-center gap-2">
        <Link
          href={`/canhotos/${id}/editar`}
          aria-label="Editar entrega"
          className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition-[transform,color,border-color] duration-150 hover:border-amber-500/40 hover:text-amber-600 active:scale-90"
        >
          <SquarePen className="size-4" />
        </Link>
        <button
          type="button"
          aria-label="Mais ações"
          onClick={() => setMenuAberto((v) => !v)}
          className="rounded-lg border border-slate-200 p-1.5 text-slate-500 transition-[transform,color,border-color] duration-150 hover:border-amber-500/40 hover:text-amber-600 active:scale-90"
        >
          <MoreVertical className="size-4" />
        </button>

        <AnimatePresence>
          {menuAberto && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuAberto(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -2 }}
                transition={{ type: "spring", duration: 0.25, bounce: 0 }}
                style={{ transformOrigin: "top right" }}
                className="absolute right-0 top-full z-20 mt-1 w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
              >
                <button
                  type="button"
                  onClick={() => {
                    setMenuAberto(false);
                    setConfirmando(true);
                  }}
                  className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                >
                  <Trash2 className="size-4" />
                  Excluir
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {confirmando && (
          <Modal onClose={() => setConfirmando(false)}>
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-[15px] font-bold">Excluir entrega {numero}?</h3>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setConfirmando(false)}
                className="text-slate-400 transition-colors hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="text-sm text-slate-500">
              Cliente <span className="font-semibold text-slate-700">{cliente}</span>.
              Essa ação não pode ser desfeita.
            </p>
            {erro && (
              <div className="mt-4 rounded-xl border border-red-200 px-3.5 py-2.5 text-xs font-semibold text-red-700">
                {erro}
              </div>
            )}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmando(false)}
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
        )}
      </AnimatePresence>
    </>
  );
}
