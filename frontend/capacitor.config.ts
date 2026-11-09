import type { CapacitorConfig } from "@capacitor/cli";

// Sem "server.url" fixo de propósito: o app abre com um launcher local
// (capacitor-www/index.html) que navega a WebView pro domínio fixo da loja
// (entregas.rildoneletro.tech). Antes disso o app usava um túnel Cloudflare
// que trocava a cada reinício (descoberta via config central no GitHub +
// tela de "informar endereço do servidor" como fallback) — com domínio
// próprio isso não existe mais. Ver /claude/plano-app-nativo.md no projeto.
//
// allowNavigation: sem isso, o Capacitor trata qualquer host fora do app como
// "externo" e abre no navegador do celular (e, com o PWA instalado, o Android
// abre o PWA) em vez de navegar dentro da própria WebView. Se o domínio da
// loja mudar de novo, atualizar aqui e em capacitor-www/index.html
// (BASE_URL), depois rodar "npx cap sync android".
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
    allowNavigation: ["entregas.rildoneletro.tech"],
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
