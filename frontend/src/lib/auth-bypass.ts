// Atalhos de autenticação só para CI/desenvolvimento. Nunca valem em
// produção: E2E exige CI=true e o de dev exige NODE_ENV diferente de
// "production". Centralizado aqui para o proxy e os helpers de sessão
// concordarem.
export function authBypassAtivo(): boolean {
  if (process.env.CI === "true" && process.env.E2E_AUTH_BYPASS === "true") {
    return true;
  }
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_AUTH_BYPASS === "true"
  );
}
