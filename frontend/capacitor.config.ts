import type { CapacitorConfig } from "@capacitor/cli";

// Sem "server.url" fixo de propósito: o app abre com um launcher local
// (capacitor-www/index.html) que descobre a URL atual do túnel sozinho
// (config central no GitHub + campo manual de override) e navega a WebView
// pra lá. Ver /claude/plano-app-nativo.md no projeto pra detalhes.
//
// allowNavigation: sem isso, o Capacitor trata qualquer host fora do app como
// "externo" e abre no navegador do celular (e, com o PWA instalado, o Android
// abre o PWA) em vez de navegar dentro da própria WebView. Precisa listar os
// domínios que o launcher pode abrir. Se um dia trocar o Quick Tunnel por um
// domínio fixo, adicionar o domínio aqui e rodar "npx cap sync android".
//
// useLegacyBridge: exigido pelo plugin de localização em segundo plano; sem
// isso o Android para de entregar posições depois de ~5 min em segundo plano.
//
// CapacitorCookies: faz o plugin HTTP nativo usar os mesmos cookies da
// WebView (sessão do motorista), que é como a localização é enviada com o
// app em segundo plano.
const config: CapacitorConfig = {
  appId: "br.com.rildon.canhotodigital.motorista",
  appName: "Motorista — Canhoto Digital",
  webDir: "capacitor-www",
  server: {
    allowNavigation: ["*.trycloudflare.com", "entregas.rildoneletro.tech"],
  },
  android: {
    allowMixedContent: false,
    useLegacyBridge: true,
  },
  plugins: {
    CapacitorCookies: {
      enabled: true,
    },
  },
};

export default config;
