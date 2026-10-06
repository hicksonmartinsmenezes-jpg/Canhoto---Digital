"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CloudOff, RefreshCw, ServerOff } from "lucide-react";
import {
  useEstadoConexao,
  verificarConexaoAgora,
} from "@/lib/conexao-servidor";

declare global {
  interface Window {
    Capacitor?: { isNativePlatform?: () => boolean };
  }
}

/** Endereço da tela inicial do app Android (launcher que procura o servidor). */
const LAUNCHER_DO_APP = "https://localhost/";

/**
 * Faixa no topo quando o aparelho está sem internet ou o servidor da loja não
 * responde. O app segue funcionando com o que está guardado no aparelho; o que
 * o motorista finalizar é enviado sozinho quando a conexão voltar.
 */
export function MotoristaConexaoAviso() {
  const router = useRouter();
  const caminho = usePathname();
  const estado = useEstadoConexao();
  const estadoAnteriorRef = useRef(estado);

  useEffect(() => {
    // Conexão voltou: busca os dados novos (a tela pode estar mostrando a cópia
    // guardada no aparelho).
    if (estadoAnteriorRef.current !== "ok" && estado === "ok") {
      router.refresh();
    }
    estadoAnteriorRef.current = estado;
  }, [estado, router]);

  // A tela "sem conexão" já explica tudo sozinha.
  if (estado === "ok" || caminho === "/motorista/offline") return null;

  const semInternet = estado === "sem-internet";
  const noApp =
    typeof window !== "undefined" &&
    window.Capacitor?.isNativePlatform?.() === true;

  return (
    <div
      className="sticky top-0 z-[60] border-b border-amber-300 bg-amber-100 px-4 py-2.5"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-amber-800">
          {semInternet ? (
            <CloudOff className="size-4" />
          ) : (
            <ServerOff className="size-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black text-amber-950">
            {semInternet
              ? "Sem internet"
              : "Servidor da loja não está respondendo"}
          </p>
          <p className="mt-0.5 text-[11px] font-medium leading-4 text-amber-900">
            Você pode continuar: o que finalizar fica guardado neste aparelho e
            é enviado sozinho quando a conexão voltar. Os dados na tela podem
            estar desatualizados.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          <button
            type="button"
            onClick={() => void verificarConexaoAgora()}
            className="inline-flex items-center gap-1 rounded-lg bg-white/80 px-2 py-1 text-[11px] font-black text-amber-950"
          >
            <RefreshCw className="size-3" />
            Tentar
          </button>
          {!semInternet && noApp && (
            <button
              type="button"
              onClick={() => window.location.assign(LAUNCHER_DO_APP)}
              className="rounded-lg bg-amber-900 px-2 py-1 text-[11px] font-black text-white"
            >
              Reconectar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
