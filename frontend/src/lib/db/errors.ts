export function codigoErroPostgres(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }

  return null;
}

// Nome da constraint violada (ex.: "colaboradores_celular_key") — usado pra
// diferenciar qual coluna causou um erro 23505 (unique_violation) e devolver
// uma mensagem específica em vez de um erro genérico.
export function nomeConstraintPostgres(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "constraint" in error &&
    typeof (error as { constraint?: unknown }).constraint === "string"
  ) {
    return (error as { constraint: string }).constraint;
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
