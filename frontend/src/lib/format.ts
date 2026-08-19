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

// Recebe um timestamptz ISO e devolve só o horário "HH:mm" (fuso do servidor).
export function formatTimeBR(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
