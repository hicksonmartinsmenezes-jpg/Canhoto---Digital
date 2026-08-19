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
};

export default nextConfig;
