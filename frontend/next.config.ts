import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    // O botao do Next.js Dev Tools (bolinha preta com o logo, canto inferior
    // esquerdo) so aparece em desenvolvimento - nao e nosso componente, e do
    // proprio Next. Movido pra direita porque ficava sobreposto a barra
    // lateral (que agora ocupa a faixa esquerda de forma permanente).
    devIndicators: {
          position: "bottom-right",
    },
    // A partir do Next 15, o servidor de dev bloqueia (403) requisicoes aos
    // arquivos internos (_next/*) e o WebSocket de Hot Reload quando o
    // "Origin" da requisicao nao e localhost - e uma protecao contra DNS
    // rebinding. Isso quebra o acesso via IP da rede local (outro computador
    // testando http://192.168.0.228:3002), mesmo a pagina abrindo: os bundles
    // JS voltam 403, entao nada de React/eventos funciona de fato. Liberando
    // explicitamente o IP da maquina que roda o `npm run dev`.
    allowedDevOrigins: ["192.168.0.228"],
    // Existe um package-lock.json na raiz do repo Git, alem do de frontend/
    // (o real, usado pelo npm install daqui) - o Turbopack detecta os dois
    // lockfiles e tenta adivinhar a raiz do workspace, gerando um aviso a
    // cada `npm run dev`. Fixando explicitamente: a raiz e esta pasta
    // (frontend/), nao a raiz do repositorio Git. Issue #3.
    turbopack: {
          root: __dirname,
    },
};

export default nextConfig;
