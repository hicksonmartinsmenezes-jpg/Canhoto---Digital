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

export function mensagemErroBanco(
  contexto: string,
  error: unknown
): string {
  console.error(`[${contexto}] erro PostgreSQL`, error);
  return "O banco de dados não conseguiu concluir a operação.";
}
