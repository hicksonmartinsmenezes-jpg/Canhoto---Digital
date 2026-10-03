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
