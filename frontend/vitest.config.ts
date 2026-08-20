import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Testes unitários de funções puras (formatação, status, regras de rate
// limit) — sem jsdom/testing-library de propósito: ainda não há teste de
// componente React planejado, e adicionar esse peso agora seria
// overengineering. Se/quando fizer sentido testar um componente, adicionar
// `environment: "jsdom"` + `@testing-library/react` nesse momento, não antes.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
