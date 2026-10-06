// Utilitários de CSV do relatório de entregas.
//
// Separador ";" — o Excel configurado em português do Brasil abre CSV com
// vírgula tudo numa coluna só (a vírgula é o separador decimal lá).

export const SEPARADOR_CSV = ";";

/**
 * Escapa uma célula (RFC 4180) e neutraliza "injeção de fórmula": nome de
 * cliente é texto livre, e uma célula começando com = + - @ (ou TAB/CR) é
 * executada como fórmula pelo Excel/Planilhas ao abrir o arquivo. O prefixo
 * apóstrofo força o tratamento como texto.
 */
export function celulaCsv(valor: string): string {
  let texto = valor;
  if (/^[=+\-@\t\r]/.test(texto)) {
    texto = `'${texto}`;
  }
  if (/[";\r\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

export function linhaCsv(celulas: string[]): string {
  return celulas.map(celulaCsv).join(SEPARADOR_CSV);
}
