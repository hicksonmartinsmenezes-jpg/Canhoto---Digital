// Rascunho do comprovante de entrega guardado no próprio celular (IndexedDB).
//
// Foto, assinatura e (se houver) comprovante Pix são salvos aqui ANTES de
// qualquer envio. Se o sinal cair, o Android matar o app ou a página
// recarregar, nada se perde: o rascunho continua no aparelho até o servidor
// confirmar. Só código de navegador — não importar em Server Components.

export interface RascunhoComprovante {
  entregaId: string;
  /** Texto curto para identificar a entrega na lista (ex.: "#123 · Maria"). */
  rotulo: string | null;
  fotoEntrega: Blob;
  comprovantePix: Blob | null;
  assinatura: Blob;
  criadoEm: number;
  tentativas: number;
  /** O servidor recusou (não é falha de rede): para o reenvio automático. */
  rejeitado: boolean;
  ultimoErro: string | null;
}

export interface NovoRascunhoComprovante {
  entregaId: string;
  rotulo?: string | null;
  fotoEntrega: Blob;
  comprovantePix?: Blob | null;
  assinatura: Blob;
}

const NOME_BANCO = "canhoto-motorista";
const NOME_STORE = "comprovantes";
const VERSAO_BANCO = 1;

function abrirBanco(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);

  return new Promise((resolve) => {
    try {
      const pedido = indexedDB.open(NOME_BANCO, VERSAO_BANCO);
      pedido.onupgradeneeded = () => {
        const banco = pedido.result;
        if (!banco.objectStoreNames.contains(NOME_STORE)) {
          banco.createObjectStore(NOME_STORE, { keyPath: "entregaId" });
        }
      };
      pedido.onsuccess = () => resolve(pedido.result);
      pedido.onerror = () => resolve(null);
      pedido.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function comStore<T>(
  modo: IDBTransactionMode,
  operacao: (store: IDBObjectStore) => IDBRequest<T> | null
): Promise<T | null> {
  const banco = await abrirBanco();
  if (!banco) return null;

  return new Promise<T | null>((resolve) => {
    try {
      const transacao = banco.transaction(NOME_STORE, modo);
      const pedido = operacao(transacao.objectStore(NOME_STORE));
      let resultado: T | null = null;

      if (pedido) {
        pedido.onsuccess = () => {
          resultado = pedido.result;
        };
      }
      transacao.oncomplete = () => {
        banco.close();
        resolve(resultado);
      };
      transacao.onerror = transacao.onabort = () => {
        banco.close();
        resolve(null);
      };
    } catch {
      banco.close();
      resolve(null);
    }
  });
}

/** true se gravou. false = o aparelho não deixou guardar (modo privado etc.). */
export async function salvarRascunho(
  novo: NovoRascunhoComprovante
): Promise<boolean> {
  const rascunho: RascunhoComprovante = {
    entregaId: novo.entregaId,
    rotulo: novo.rotulo ?? null,
    fotoEntrega: novo.fotoEntrega,
    comprovantePix: novo.comprovantePix ?? null,
    assinatura: novo.assinatura,
    criadoEm: Date.now(),
    tentativas: 0,
    rejeitado: false,
    ultimoErro: null,
  };

  const chave = await comStore("readwrite", (store) => store.put(rascunho));
  return chave !== null;
}

export async function lerRascunho(
  entregaId: string
): Promise<RascunhoComprovante | null> {
  const encontrado = await comStore<RascunhoComprovante | undefined>(
    "readonly",
    (store) => store.get(entregaId)
  );
  return encontrado ?? null;
}

export async function listarRascunhos(): Promise<RascunhoComprovante[]> {
  const todos = await comStore<RascunhoComprovante[]>("readonly", (store) =>
    store.getAll()
  );
  return (todos ?? []).sort((a, b) => a.criadoEm - b.criadoEm);
}

export async function apagarRascunho(entregaId: string): Promise<void> {
  await comStore("readwrite", (store) => store.delete(entregaId));
}

export async function atualizarRascunho(
  entregaId: string,
  alteracoes: Partial<
    Pick<RascunhoComprovante, "tentativas" | "rejeitado" | "ultimoErro">
  >
): Promise<void> {
  const atual = await lerRascunho(entregaId);
  if (!atual) return;
  await comStore("readwrite", (store) =>
    store.put({ ...atual, ...alteracoes })
  );
}
