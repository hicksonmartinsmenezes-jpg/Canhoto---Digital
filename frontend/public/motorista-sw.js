// Service worker da área do motorista.
//
// Objetivo: o app continuar abrindo e funcionando quando o celular está sem
// sinal (ou quando o servidor da loja está fora do ar). Sem isso o Android
// mostra "Webpage not available" e o motorista não consegue nem finalizar a
// entrega para guardar o comprovante.
//
// O que ele guarda no aparelho:
//   - arquivos fixos do app (/_next/static/*): cache primeiro (nome tem hash);
//   - imagens do app (logo, ícones): usa o que tem e atualiza em segundo plano;
//   - páginas do motorista (lista e entregas do dia): rede primeiro, e, se a
//     rede falhar ou demorar, a última cópia (válida por IDADE_MAXIMA_PAGINA_MS);
//   - a tela "sem conexão" (/motorista/offline), guardada na instalação.
//
// O que NÃO faz: não intercepta Server Actions (POST), nem /motorista/api/*,
// nem decide quando enviar o comprovante — isso é do próprio app (IndexedDB +
// reenvio). As páginas guardadas são apagadas quando o motorista cai na tela
// de login (sair da conta ou sessão vencida).

const VERSAO = "v1";
const CACHE_ESTATICO = "motorista-estatico-" + VERSAO;
const CACHE_PAGINAS = "motorista-paginas-" + VERSAO;
const PAGINA_OFFLINE = "/motorista/offline";
const IDADE_MAXIMA_PAGINA_MS = 18 * 60 * 60 * 1000;
const TEMPO_REDE_MS = 5000;
const CABECALHO_GUARDADO_EM = "x-sw-guardado-em";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(precarregar([PAGINA_OFFLINE]).catch(() => {}));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const nomes = await caches.keys();
      await Promise.all(
        nomes
          .filter(
            (nome) =>
              nome.startsWith("motorista-") &&
              nome !== CACHE_ESTATICO &&
              nome !== CACHE_PAGINAS
          )
          .map((nome) => caches.delete(nome))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  const dados = event.data;
  if (!dados || dados.tipo !== "precarregar" || !Array.isArray(dados.urls)) {
    return;
  }

  const urls = dados.urls.filter(
    (u) => typeof u === "string" && u.startsWith("/motorista")
  );
  event.waitUntil(precarregar(urls).catch(() => {}));
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cachePrimeiro(req));
    return;
  }

  if (req.mode === "navigate" && url.pathname.startsWith("/motorista")) {
    event.respondWith(navegacao(event));
    return;
  }

  // "?t=" é usado pelo app para testar se o servidor responde de verdade:
  // nunca pode vir do cache.
  if (
    /\.(?:png|jpg|jpeg|gif|webp|svg|ico)$/i.test(url.pathname) &&
    !url.searchParams.has("t")
  ) {
    event.respondWith(usaCacheEAtualiza(req));
  }
});

// ---------------------------------------------------------------- estáticos

async function cachePrimeiro(req) {
  const cache = await caches.open(CACHE_ESTATICO);
  const guardado = await cache.match(req);
  if (guardado) return guardado;

  const resposta = await fetch(req);
  if (resposta.ok) cache.put(req, resposta.clone()).catch(() => {});
  return resposta;
}

async function usaCacheEAtualiza(req) {
  const cache = await caches.open(CACHE_ESTATICO);
  const guardado = await cache.match(req);

  const atualizacao = fetch(req)
    .then((resposta) => {
      if (resposta.ok) cache.put(req, resposta.clone()).catch(() => {});
      return resposta;
    })
    .catch(() => null);

  if (guardado) return guardado;

  const resposta = await atualizacao;
  return resposta || Response.error();
}

// ------------------------------------------------------------------ páginas

function ehHtml(resposta) {
  const tipo = resposta.headers.get("content-type") || "";
  return tipo.includes("text/html");
}

function podeGuardarPagina(resposta, url) {
  return (
    resposta.ok &&
    resposta.type === "basic" &&
    !resposta.redirected &&
    ehHtml(resposta) &&
    url.pathname !== "/motorista/login"
  );
}

async function guardarPagina(chave, resposta) {
  const corpo = await resposta.arrayBuffer();
  const cabecalhos = new Headers(resposta.headers);
  cabecalhos.set(CABECALHO_GUARDADO_EM, String(Date.now()));

  const cache = await caches.open(CACHE_PAGINAS);
  await cache.put(
    chave,
    new Response(corpo, { status: 200, headers: cabecalhos })
  );
}

async function paginaGuardadaValida(req) {
  const cache = await caches.open(CACHE_PAGINAS);
  const guardada = await cache.match(req, {
    ignoreSearch: true,
    ignoreVary: true,
  });
  if (!guardada) return null;

  const guardadaEm = Number(guardada.headers.get(CABECALHO_GUARDADO_EM));
  if (!guardadaEm || Date.now() - guardadaEm > IDADE_MAXIMA_PAGINA_MS) {
    return null;
  }
  return guardada;
}

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function respostaSemConexao() {
  const cache = await caches.open(CACHE_ESTATICO);
  const offline = await cache.match(PAGINA_OFFLINE);

  if (offline) {
    return Response.redirect(
      new URL(PAGINA_OFFLINE, self.location.origin).href,
      302
    );
  }

  return new Response(
    '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      "<title>Sem conexão</title></head>" +
      '<body style="font-family:sans-serif;padding:24px">' +
      "<h2>Sem conexão com o servidor</h2>" +
      "<p>Abra o app de novo quando o sinal voltar. Comprovantes já " +
      "finalizados continuam guardados neste aparelho.</p></body></html>",
    {
      status: 503,
      headers: { "content-type": "text/html; charset=utf-8" },
    }
  );
}

async function navegacao(event) {
  const req = event.request;
  const url = new URL(req.url);

  // A própria tela "sem conexão": rede primeiro, senão a cópia da instalação.
  if (url.pathname === PAGINA_OFFLINE) {
    try {
      return await fetch(req);
    } catch {
      const cache = await caches.open(CACHE_ESTATICO);
      const offline = await cache.match(PAGINA_OFFLINE);
      return offline || respostaSemConexao();
    }
  }

  const guardada = await paginaGuardadaValida(req);

  const rede = fetch(req).then((resposta) => {
    if (podeGuardarPagina(resposta, url)) {
      event.waitUntil(guardarPagina(req.url, resposta.clone()).catch(() => {}));
    }
    return resposta;
  });

  if (!guardada) {
    try {
      return await rede;
    } catch {
      return respostaSemConexao();
    }
  }

  // Tem cópia: espera a rede só um pouco. Se falhar ou demorar, usa a cópia;
  // a requisição continua em segundo plano e atualiza o que está guardado.
  event.waitUntil(rede.catch(() => {}));
  try {
    return await Promise.race([
      rede,
      esperar(TEMPO_REDE_MS).then(() => {
        throw new Error("rede lenta");
      }),
    ]);
  } catch {
    return guardada;
  }
}

// ----------------------------------------------------------------- precarga

function chunksCitados(texto) {
  const achados = new Set();
  const regex =
    /(?:\/_next\/)?static\/(?:chunks|css|media)\/[A-Za-z0-9_.\-~%[\]]+\.(?:js|css|woff2?)/g;

  for (const trecho of texto.match(regex) || []) {
    achados.add(trecho.startsWith("/_next/") ? trecho : "/_next/" + trecho);
  }
  return [...achados];
}

async function guardarEstatico(caminho) {
  const cache = await caches.open(CACHE_ESTATICO);
  if (await cache.match(caminho)) return;

  const resposta = await fetch(caminho);
  if (resposta.ok) await cache.put(caminho, resposta);
}

// Baixa as páginas indicadas (com a sessão do motorista) e os arquivos que
// elas usam, para funcionarem sem internet.
async function precarregar(urls) {
  for (const caminho of urls) {
    try {
      const resposta = await fetch(caminho, {
        credentials: "same-origin",
        headers: { accept: "text/html" },
      });
      const url = new URL(caminho, self.location.origin);

      if (!resposta.ok || resposta.redirected || !ehHtml(resposta)) continue;

      const texto = await resposta.clone().text();

      if (url.pathname === PAGINA_OFFLINE) {
        const cache = await caches.open(CACHE_ESTATICO);
        await cache.put(PAGINA_OFFLINE, resposta.clone());
      } else if (podeGuardarPagina(resposta, url)) {
        await guardarPagina(url.pathname + url.search, resposta.clone());
      }

      await Promise.all(
        chunksCitados(texto).map((arquivo) =>
          guardarEstatico(arquivo).catch(() => {})
        )
      );
    } catch {
      // Sem rede agora: tenta de novo na próxima precarga.
    }
  }
}
