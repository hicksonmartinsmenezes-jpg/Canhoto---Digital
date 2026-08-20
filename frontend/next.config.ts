import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // O botão do Next.js Dev Tools (bolinha preta com o logo, canto inferior
  // esquerdo) só aparece em desenvolvimento — não é nosso componente, é do
  // próprio Next. Movido pra direita porque ficava sobreposto à barra
  // lateral (que agora ocupa a faixa esquerda de forma permanente).
  devIndicators: {
    position: "bottom-right",
  },
  // A partir do Next 15, o servidor de dev bloqueia (403) requisições aos
  // arquivos internos (_next/*) e o WebSocket de Hot Reload quando o
  // "Origin" da requisição não é localhost — é uma proteção contra DNS
  // rebinding. Isso quebra o acesso via IP da rede local (outro computador
  // testando http://192.168.0.228:3002), mesmo a página abrindo: os bundles
  // JS voltam 403, então nada de React/eventos funciona de fato. Liberando
  // explicitamente o IP da máquina que roda o `npm run dev`.
  allowedDevOrigins: ["192.168.0.228"],
};

export default nextConfig;
