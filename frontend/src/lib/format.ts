// Helpers de formatação compartilhados — usados ao exibir dados vindos do
// Supabase (números e datas "cruas" do Postgres) no mesmo formato visual
// que os mocks já usavam (ex. "R$ 235,32", "18/08/2026").

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// Recebe uma data no formato ISO do Postgres (date "2026-08-18" ou
// timestamptz "2026-08-18T14:32:00+00:00") e devolve "dd/mm/aaaa".
export function formatDateBR(isoDate: string): string {
  const datePart = isoDate.slice(0, 10);
  const [year, month, day] = datePart.split("-");
  return `${day}/${month}/${year}`;
}

// Máscara de valor monetário para inputs: recebe o texto já digitado + a
// tecla nova, mantém só os dígitos e trata como centavos (como uma
// maquininha de cartão) — sempre formata como "R$ 128,25" enquanto digita,
// sem o usuário precisar acertar vírgula manualmente.
export function maskCurrencyInput(rawDigits: string): string {
  const digits = rawDigits.replace(/\D/g, "");
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  return (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Converte o texto mascarado ("1.128,25") de volta para número (1128.25).
export function parseCurrencyInput(masked: string): number {
  const semMilhar = masked.replace(/\./g, "").replace(",", ".");
  return Number(semMilhar) || 0;
}
