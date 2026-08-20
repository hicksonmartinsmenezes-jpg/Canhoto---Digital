import { defineConfig, devices } from "@playwright/test";

// Testes end-to-end de fumaça (smoke) — cobrem só "a tela carrega e as
// interações básicas de UI funcionam", NÃO fluxos completos de gravação no
// Supabase (isso exigiria um banco de teste dedicado, fora do escopo da
// esteira "essencial" adotada em 20/08/2026 — ver claude/ideias-decisoes-
// projeto.md). Como @/lib/supabase/admin devolve `null` sem as variáveis de
// ambiente configuradas, e toda a camada de leitura já trata esse `null`
// como "banco vazio" (ver @/lib/data/entregas.ts), o app builda e roda
// normalmente em CI sem nenhum segredo do Supabase — só sem dados reais.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3002",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3002",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
