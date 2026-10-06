// Estado da conexão do app do motorista com o servidor da loja.
//
// "navigator.onLine" só diz se o aparelho tem rede; não diz se o servidor está
// no ar (túnel caído, endereço trocado). Por isso, além dos eventos
// online/offline, de tempos em tempos pedimos um arquivo pequeno ao servidor.
// Só código de navegador — não importar em Server Components.

import { useSyncExternalStore } from "react";

export type EstadoConexao = "ok" | "sem-internet" | "sem-servidor";

/** Disparado em `window` quando a conexão volta depois de ter caído. */
export const EVENTO_CONEXAO_RESTAURADA = "canhoto:conexao-restaurada";

const CAMINHO_SONDA = "/icons/motorista-icon-192.png";
const INTERVALO_MS = 20_000;
const TEMPO_SONDA_MS = 6_000;
const FALHAS_PARA_SEM_SERVIDOR = 2;

let estado: EstadoConexao = "ok";
let falhasSeguidas = 0;
let monitorAtivo = false;
let intervalo: number | undefined;
const ouvintes = new Set<() => void>();

function definirEstado(novo: EstadoConexao) {
  if (novo === estado) return;

  const anterior = estado;
  estado = novo;
  ouvintes.forEach((ouvinte) => ouvinte());

  if (anterior !== "ok" && novo === "ok") {
    window.dispatchEvent(new Event(EVENTO_CONEXAO_RESTAURADA));
  }
}

async function sondarServidor(): Promise<boolean> {
  const controle = new AbortController();
  const timer = window.setTimeout(() => controle.abort(), TEMPO_SONDA_MS);

  try {
    const resposta = await fetch(`${CAMINHO_SONDA}?t=${Date.now()}`, {
      cache: "no-store",
      signal: controle.signal,
    });
    return resposta.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function verificarConexaoAgora(): Promise<void> {
  if (typeof window === "undefined") return;

  if (navigator.onLine === false) {
    falhasSeguidas = 0;
    definirEstado("sem-internet");
    return;
  }

  if (await sondarServidor()) {
    falhasSeguidas = 0;
    definirEstado("ok");
    return;
  }

  falhasSeguidas += 1;
  if (falhasSeguidas >= FALHAS_PARA_SEM_SERVIDOR) {
    definirEstado("sem-servidor");
  } else {
    // Uma falha isolada pode ser só um solavanco do sinal: confere já em seguida.
    window.setTimeout(() => void verificarConexaoAgora(), 3_000);
  }
}

function aoMudarVisibilidade() {
  if (document.visibilityState === "visible") void verificarConexaoAgora();
}

function iniciarMonitor() {
  if (monitorAtivo || typeof window === "undefined") return;
  monitorAtivo = true;

  if (navigator.onLine === false) estado = "sem-internet";

  window.addEventListener("online", verificarConexaoAgora);
  window.addEventListener("offline", verificarConexaoAgora);
  document.addEventListener("visibilitychange", aoMudarVisibilidade);
  intervalo = window.setInterval(() => {
    if (document.visibilityState === "visible") void verificarConexaoAgora();
  }, INTERVALO_MS);

  void verificarConexaoAgora();
}

function pararMonitor() {
  if (!monitorAtivo || typeof window === "undefined") return;
  monitorAtivo = false;

  window.removeEventListener("online", verificarConexaoAgora);
  window.removeEventListener("offline", verificarConexaoAgora);
  document.removeEventListener("visibilitychange", aoMudarVisibilidade);
  if (intervalo !== undefined) window.clearInterval(intervalo);
  intervalo = undefined;
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  iniciarMonitor();

  return () => {
    ouvintes.delete(ouvinte);
    if (ouvintes.size === 0) pararMonitor();
  };
}

/** Estado atual, para código fora do React (ex.: atualização automática). */
export function obterEstadoConexao(): EstadoConexao {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return "sem-internet";
  }
  return estado;
}

export function useEstadoConexao(): EstadoConexao {
  return useSyncExternalStore(
    assinar,
    () => estado,
    () => "ok"
  );
}
