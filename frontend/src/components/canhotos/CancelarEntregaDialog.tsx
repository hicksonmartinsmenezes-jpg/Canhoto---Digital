"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { cancelarEntrega } from "@/app/canhotos/actions";

/** Janela de cancelamento: o motivo é obrigatório e vai para o histórico. */
export function CancelarEntregaDialog({
  id,
  numero,
  cliente,
  onClose,
}: {
  id: string;
  numero: string;
  cliente: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmar() {
    setErro(null);
    if (motivo.trim().length < 3) {
      setErro("Informe o motivo do cancelamento.");
      return;
    }
    startTransition(async () => {
      let resultado: Awaited<ReturnType<typeof cancelarEntrega>>;
      try {
        resultado = await cancelarEntrega(id, motivo);
      } catch {
        setErro("Sem conexão com o servidor. Tente de novo.");
        return;
      }
      if (!resultado.ok) {
        setErro(resultado.error ?? "Não foi possível cancelar a entrega.");
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal onClose={() => !pending && onClose()}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-bold">Cancelar entrega {numero}?</h3>
        <button
          type="button"
          aria-label="Fechar"
          onClick={onClose}
          disabled={pending}
          className="text-slate-400 transition-colors hover:text-slate-600"
        >
          <X className="size-4" />
        </button>
      </div>
      <p className="text-sm text-slate-500">
        Cliente <span className="font-semibold text-slate-700">{cliente}</span>.
        A entrega sai da lista do motorista e o motivo fica registrado no
        histórico.
      </p>

      <label className="mt-4 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
        Motivo
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          maxLength={300}
          rows={3}
          autoFocus
          placeholder="Ex.: cliente desistiu da compra"
          className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm normal-case tracking-normal text-slate-700 outline-none focus:border-slate-400"
        />
      </label>

      {erro && (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700"
        >
          {erro}
        </div>
      )}

      <div className="mt-5 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="text-sm font-bold text-slate-500 hover:text-slate-700"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={confirmar}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-500 disabled:opacity-60"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Cancelar entrega
        </button>
      </div>
    </Modal>
  );
}
