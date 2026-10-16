// Ajudantes do navegador para conversar com o service worker do motorista
// (public/motorista-sw.js) e com as páginas que ele guarda no aparelho.
// Só código de navegador — não importar em Server Components.

const PREFIXO_CACHE_PAGINAS = "motorista-paginas-";

const TEMPO_PRECARGA_MS = 90_000;

/**
 * Pede ao service worker para baixar e guardar estas páginas (e seus arquivos).
 * Devolve true quando a lista e a tela "sem conexão" ficaram guardadas, ou
 * false se não deu (sem service worker, sem internet, tempo esgotado).
 */
export async function pedirPrecarga(caminhos: string[]): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registro = await navigator.serviceWorker.ready;
    const ativo = registro.active;
    if (!ativo) return false;

    return await new Promise<boolean>((resolve) => {
      const canal = new MessageChannel();
      const timer = window.setTimeout(() => resolve(false), TEMPO_PRECARGA_MS);

      canal.port1.onmessage = (evento: MessageEvent<{ ok?: boolean }>) => {
        window.clearTimeout(timer);
        resolve(evento.data?.ok === true);
      };

      ativo.postMessage({ tipo: "precarregar", urls: caminhos }, [canal.port2]);
    });
  } catch {
    // Sem service worker: o app segue funcionando só com internet.
    return false;
  }
}

/** Apaga TODAS as páginas guardadas (ao sair da conta ou quando a sessão vence). */
export async function limparPaginasGuardadas(): Promise<void> {
  if (typeof caches === "undefined") return;

  try {
    const nomes = await caches.keys();
    await Promise.all(
      nomes
        .filter((nome) => nome.startsWith(PREFIXO_CACHE_PAGINAS))
        .map((nome) => caches.delete(nome))
    );
  } catch {
    // Sem acesso ao cache: nada a limpar.
  }
}

/** Apaga a cópia guardada de uma página (ex.: entrega que acabou de ser enviada). */
export async function esquecerPaginaGuardada(caminho: string): Promise<void> {
  if (typeof caches === "undefined") return;

  try {
    const nomes = await caches.keys();
    await Promise.all(
      nomes
        .filter((nome) => nome.startsWith(PREFIXO_CACHE_PAGINAS))
        .map(async (nome) => {
          const cache = await caches.open(nome);
          await cache.delete(caminho, { ignoreSearch: true });
        })
    );
  } catch {
    // Sem acesso ao cache: nada a limpar.
  }
}
