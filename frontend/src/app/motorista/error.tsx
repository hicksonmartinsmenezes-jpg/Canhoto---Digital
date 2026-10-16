"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

// Rede de segurança do app do motorista: qualquer erro inesperado ao montar
// uma tela cai aqui em vez da página de erro padrão do Next (em inglês e sem
// saída). Quase sempre é sinal fraco — tentar de novo resolve.
export default function ErroMotorista({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro no app do motorista:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F7FB] px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-sm">
        <p className="text-base font-black text-[#0A1F44]">
          Não foi possível carregar
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Confira o sinal do celular e tente de novo. Suas entregas e
          comprovantes já enviados não foram afetados.
        </p>

        <button
          type="button"
          onClick={reset}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#1768D8] px-4 text-sm font-black text-white"
        >
          <RefreshCw className="size-4" />
          Tentar de novo
        </button>

        <a
          href="/motorista/login"
          className="mt-3 inline-flex min-h-12 w-full items-center justify-center text-sm font-bold text-slate-500"
        >
          Voltar para o login
        </a>
      </div>
    </div>
  );
}
