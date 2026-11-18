"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  MAX_NUMERO_NFE,
  lancarNotaFiscal,
} from "@/app/canhotos/[id]/nota-actions";

/**
 * Campo para lançar a NF-e que faltava. Aparece só quando a entrega está sem
 * número: a nota costuma sair depois do pagamento, que muitas vezes acontece
 * na própria entrega.
 */
export function LancarNotaFiscal({ entregaId }: { entregaId: string }) {
  const router = useRouter();
  const [numero, setNumero] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function salvar() {
    if (pending) return;
    if (!numero.trim()) {
      setErro("Informe o número da NF-e.");
      return;
    }
    setErro(null);
    startTransition(async () => {
      let resultado: Awaited<ReturnType<typeof lancarNotaFiscal>>;
      try {
        resultado = await lancarNotaFiscal(entregaId, numero);
      } catch {
        setErro("Sem conexão com o servidor. Tente de novo.");
        return;
      }
      if (!resultado.ok) {
        setErro(resultado.error ?? "Não foi possível lançar a NF-e.");
        return;
      }
      setNumero("");
      router.refresh();
    });
  }

  return (
    <div className="mt-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && salvar()}
          maxLength={MAX_NUMERO_NFE}
          placeholder="Lançar nº da NF-e"
          aria-label="Número da NF-e"
          className="w-40 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-400/20"
        />
        <button
          type="button"
          onClick={salvar}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A1F44] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Lançar
        </button>
      </div>
      {erro && (
        <p role="alert" className="mt-1 text-xs font-semibold text-red-600">
          {erro}
        </p>
      )}
    </div>
  );
}
