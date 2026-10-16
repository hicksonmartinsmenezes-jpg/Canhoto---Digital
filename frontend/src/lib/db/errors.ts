// O Drizzle embrulha o erro do driver (DrizzleQueryError "Failed query: ...")
// e guarda o erro original do Postgres em `cause`. Sem descer até ele, o
// código 23505 (registro duplicado) nunca era reconhecido e a tela mostrava
// a mensagem genérica em vez de "Essa placa já está cadastrada".
function camposDoErro(error: unknown): Record<string, unknown>[] {
  const niveis: Record<string, unknown>[] = [];
  let atual: unknown = error;
  for (let i = 0; i < 5 && typeof atual === "object" && atual !== null; i++) {
    niveis.push(atual as Record<string, unknown>);
    atual = (atual as { cause?: unknown }).cause;
  }
  return niveis;
}

export function codigoErroPostgres(error: unknown): string | null {
  for (const nivel of camposDoErro(error)) {
    if (typeof nivel.code === "string") return nivel.code;
  }
  return null;
}

// Nome da constraint violada (ex.: "colaboradores_celular_key") — usado pra
// diferenciar qual coluna causou um erro 23505 (unique_violation) e devolver
// uma mensagem específica em vez de um erro genérico.
export function nomeConstraintPostgres(error: unknown): string | null {
  for (const nivel of camposDoErro(error)) {
    if (typeof nivel.constraint === "string") return nivel.constraint;
    if (typeof nivel.constraint_name === "string") return nivel.constraint_name;
  }
  return null;
}

export function mensagemErroBanco(
  contexto: string,
  error: unknown
): string {
  console.error(`[${contexto}] erro PostgreSQL`, error);
  return "O banco de dados não conseguiu concluir a operação.";
}
