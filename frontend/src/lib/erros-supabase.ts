// Traduz mensagens de erro cruas do Postgres/Supabase (sempre em inglês)
// pra um texto em português que faça sentido pra quem está usando o
// sistema. Usada como último recurso nas Server Actions, depois das
// traduções mais específicas de cada tela (ex. e-mail/telefone duplicado em
// @/app/colaboradores/actions e @/app/motoboys/actions) — nunca deixa o
// texto original em inglês do Postgres chegar até o usuário final.
export function descreverErroSupabase(mensagem: string): string {
  const m = mensagem.toLowerCase();

  if (m.includes("duplicate key")) {
    return "já existe um registro com esse valor";
  }
  if (m.includes("violates foreign key constraint")) {
    return "esse registro está vinculado a outro e não pode ser alterado dessa forma";
  }
  if (
    m.includes("violates not-null constraint") ||
    m.includes("null value in column")
  ) {
    return "falta preencher um campo obrigatório";
  }
  if (m.includes("violates check constraint")) {
    return "um dos valores informados não é permitido";
  }
  if (m.includes("invalid input syntax")) {
    return "um dos valores informados está em formato inválido";
  }
  if (m.includes("permission denied") || m.includes("row-level security")) {
    return "sem permissão para executar essa ação";
  }
  if (
    m.includes("fetch failed") ||
    m.includes("network") ||
    m.includes("timeout") ||
    m.includes("econnrefused")
  ) {
    return "não foi possível conectar ao banco de dados — tente novamente";
  }

  // Nada reconhecido: não expõe o texto original (em inglês) pro usuário,
  // devolve um texto genérico em português.
  return "erro inesperado ao processar a solicitação";
}
