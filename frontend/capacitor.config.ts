import type { CapacitorConfig } from "@capacitor/cli";

// Sem "server.url" fixo de propósito: o app abre com um launcher local
// (capacitor-www/index.html) que descobre a URL atual do túnel sozinho
// (config central no GitHub + campo manual de override) e navega a WebView
// pra lá. Ver /claude/plano-app-nativo.md no projeto pra detalhes.
const config: CapacitorConfig = {
  appId: "br.com.rildon.canhotodigital.motorista",
  appName: "Motorista — Canhoto Digital",
  webDir: "capacitor-www",
  android: {
    allowMixedContent: false,
  },
};

export default config;
