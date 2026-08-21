"use client";

// Ação "Conferir" da coluna "Ass. Caixa" (Issue #9) — aparece só nas linhas
// com `pendenteConferencia` (entregue, pagamento recebido na hora, ainda
// sem `caixa_id`). Confirma no Supabase quem conferiu o caixa e quando.
// Mesmo padrão visual/estrutural de EntregaRowActions.tsx (Modal + useTransition).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import { Check, CircleDollarSign, Loader2, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Field, inputClass } from "@/components/canhotos/form-fields";
import { conferirCaixa } from "@/app/canhotos/actions";
import type { ColaboradorOption } from "@/lib/data/colaboradores";

interface ConferirCaixaActionProps {
  entregaId: string;
  numero: string;
  cliente: string;
  valor: string;
  colaboradores: ColaboradorOption[];
}

export function ConferirCaixaAction({
  entregaId,
  numero,
  cliente,
  valor,
  colaboradores,
}: ConferirCaixaActionProps) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [colaboradorId, setColaboradorId] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmar() {
    if (!colaboradorId) {
      setErro("Selecione quem conferiu o caixa.");
      return;
    }
    setErro(null);
    startTransition(async () => {
      const resultado = await conferirCaixa(entregaId, colaboradorId);
      if (!resultado.ok) {
        setErro(resultado.error ?? "Não foi possível confirmar a conferência.");
        return;
      }
      setAberto(false);
      setColaboradorId("");
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 transition-[transform,background-color] duration-150 hover:bg-amber-100 active:scale-[0.97]"
      >
        <CircleDollarSign className="size-3.5" />
        Conferir
      </button>

      <AnimatePresence>
        {aberto && (
          <Modal
            onClose={() => {
              setAberto(false);
              setErro(null);
            }}
          >
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-[15px] font-bold">Conferir caixa — {numero}</h3>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setAberto(false)}
                className="text-slate-400 transition-colors hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="text-sm text-slate-500">
              Cliente <span className="font-semibold text-slate-700">{cliente}</span>{" "}
              — pagamento de{" "}
              <span className="font-semibold text-slate-700">{valor}</span> recebido
              pelo motorista.
            </p>

            <div className="mt-4">
              <Field label="Quem está conferindo">
                <select
                  className={inputClass}
                  value={colaboradorId}
                  onChange={(e) => setColaboradorId(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {colaboradores.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {erro && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">
                {erro}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="text-sm font-bold text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={confirmar}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white transition-[transform,background-color] duration-150 hover:bg-amber-400 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
              >
                {pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Confirmando...
                  </>
                ) : (
                  <>
                    <Check className="size-4" />
                    Confirmar
                  </>
                )}
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
}
