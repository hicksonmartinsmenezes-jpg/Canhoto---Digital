"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CloudOff, Loader2, RefreshCw } from "lucide-react";
import { useRascunhosComprovante } from "@/components/motorista/useRascunhosComprovante";
import { EVENTO_CONEXAO_RESTAURADA } from "@/lib/conexao-servidor";

/**
 * Tela mostrada quando o app é aberto sem conexão e não há cópia da página
 * pedida no aparelho. Mostra os comprovantes que estão guardados esperando
 * envio e abre o app sozinha quando a conexão voltar.
 */
export function MotoristaOfflineView() {
  const router = useRouter();
  const { rascunhos, enviando } = useRascunhosComprovante();

  useEffect(() => {
    const abrir = () => router.replace("/motorista");
    window.addEventListener(EVENTO_CONEXAO_RESTAURADA, abrir);
    return () => window.removeEventListener(EVENTO_CONEXAO_RESTAURADA, abrir);
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center bg-[#F5F7FB] px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-amber-100 text-amber-700">
          <CloudOff className="size-7" />
        </div>
        <h1 className="mt-4 text-center text-lg font-black text-[#0A1F44]">
          Sem conexão com o servidor
        </h1>
        <p className="mt-2 text-center text-sm font-medium leading-6 text-slate-600">
          Não encontramos esta tela guardada no aparelho. O app abre sozinho
          quando a conexão voltar. Comprovantes já finalizados continuam
          guardados e serão enviados.
        </p>

        {rascunhos.length > 0 && (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-black text-amber-900">
              {rascunhos.length === 1
                ? "1 comprovante aguardando envio"
                : `${rascunhos.length} comprovantes aguardando envio`}
            </p>
            <ul className="mt-2 space-y-1.5">
              {rascunhos.map((rascunho) => (
                <li
                  key={rascunho.entregaId}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white/70 px-3 py-2 text-xs font-bold text-amber-900"
                >
                  <span className="truncate">
                    {rascunho.rotulo ?? "Entrega"}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-black">
                    {enviando.includes(rascunho.entregaId) ? (
                      <>
                        <Loader2 className="size-3 animate-spin" />
                        Enviando...
                      </>
                    ) : rascunho.rejeitado ? (
                      <>
                        <AlertTriangle className="size-3" />
                        Precisa de atenção
                      </>
                    ) : (
                      "Aguardando sinal"
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <button
          type="button"
          onClick={() => router.replace("/motorista")}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#15924A] px-4 py-3.5 text-sm font-black text-white transition hover:bg-[#117D3F]"
        >
          <RefreshCw className="size-4" />
          Tentar abrir o app
        </button>
      </div>
    </div>
  );
}
