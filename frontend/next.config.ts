import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Upload de comprovantes (Issue #68): o Next limita Server Actions a 1 MB
   * por padrão. Foto da entrega, comprovante Pix opcional e assinatura são
   * validados novamente no servidor. */
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  /* Leitura de DANFE em PDF (extrairTextoPdf): o pdfjs-dist monta seu
   * "fake worker" via import dinâmico de um arquivo (pdf.worker.mjs) que
   * fica ao lado do pdf.mjs dentro do próprio pacote. Empacotado pelo
   * Turbopack, esse import relativo quebra ("Cannot find module
   * .../pdf.worker.mjs") porque o worker não é copiado para o bundle.
   * serverExternalPackages faz o Next resolver o pacote com o require()
   * nativo do Node em vez de empacotá-lo, preservando esse caminho
   * relativo intacto. */
  serverExternalPackages: ["pdfjs-dist"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
  devIndicators: false,
  allowedDevOrigins: ["192.168.0.2", "192.168.0.228", "*.trycloudflare.com"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
