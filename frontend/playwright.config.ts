import { defineConfig, devices } from "@playwright/test";

// Testes end-to-end de fumaça (smoke) — cobrem só "a tela carrega e as
// interações básicas de UI funcionam", NÃO fluxos completos de gravação no
// banco de produção. O servidor é iniciado em modo de produção pelo Playwright.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3003",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3003",
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
