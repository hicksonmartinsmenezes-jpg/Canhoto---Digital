"use client";

import { useEffect } from "react";

// Erro inesperado numa tela do Portal: mostra uma mensagem em português com
// saída, em vez da página de erro padrão do Next.
// Resumo curto do erro para quem for dar suporte (sem dados sensíveis: só a
// mensagem do navegador e o código do servidor).
function detalheTecnico(error: Error & { digest?: string }): string {
  const partes = [error.name, error.message?.slice(0, 160), error.digest]
    .filter(Boolean)
    .join(" · ");
  return partes || "sem detalhes";
}

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
      <p className="mt-4 break-words text-[11px] leading-4 text-slate-400">
        {detalheTecnico(error)}
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
