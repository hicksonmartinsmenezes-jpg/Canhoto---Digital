"use client";

import { useEffect } from "react";

// Erro inesperado numa tela do Portal: mostra uma mensagem em português com
// saída, em vez da página de erro padrão do Next.
export default function ErroPortal({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro no Portal:", error);
  }, [error]);

  return (
    <div className="mx-auto mt-16 max-w-md border border-slate-200 bg-white p-6 text-center">
      <h1 className="text-lg font-bold text-slate-900">
        Algo deu errado ao abrir esta tela
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Tente novamente. Se o problema continuar, avise o responsável pelo
        sistema informando o horário.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 bg-[#0A1F44] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0A1F44]/90"
      >
        Tentar de novo
      </button>
    </div>
  );
}
