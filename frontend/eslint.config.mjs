import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Lixo temporário movido pra cá quando um arquivo travado (lock do git,
    // extração de zip antiga) não podia ser apagado direto — nunca faz
    // parte do código real do site, ver claude/ideias-decisoes-projeto.md.
    "_to_delete/**",
  ]),
]);

export default eslintConfig;
