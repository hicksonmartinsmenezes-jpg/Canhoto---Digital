import { NextRequest, NextResponse } from "next/server";
import { getRelatorioEntregas } from "@/lib/data/entregas";
import {
  FORMA_PAGAMENTO_LABEL,
  STATUS_LABEL,
  isDataIsoValida,
  isFormaPagamento,
  isStatusEntrega,
} from "@/lib/status";

// Exportação CSV do Relatório de entregas (Issue #8) — Route Handler em vez
// de gerar o arquivo no client: os dados já vêm do servidor (mesma consulta
// de /relatorios/page.tsx) e um GET com Content-Disposition "attachment" é
// o jeito mais simples de disparar o download do navegador sem
// JavaScript extra no client.
//
// Escapa célula pro formato CSV (RFC 4180): envolve em aspas e duplica
// aspas internas sempre que o valor contém separador, aspas ou quebra de
// linha — nome de cliente é texto livre e pode conter vírgula.
function celulaCsv(valor: string): string {
  if (/[",\n]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`;
  }
  return valor;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const inicioParam = params.get("inicio");
  const fimParam = params.get("fim");
  const statusParam = params.get("status");
  const formaParam = params.get("forma");

  const dataInicio = isDataIsoValida(inicioParam) ? inicioParam : undefined;
  const dataFim = isDataIsoValida(fimParam) ? fimParam : undefined;
  const status = isStatusEntrega(statusParam) ? statusParam : undefined;
  const formaPagamento = isFormaPagamento(formaParam) ? formaParam : undefined;

  const { itens } = await getRelatorioEntregas({
    dataInicio,
    dataFim,
    status,
    formaPagamento,
  });

  const cabecalho = ["Código", "Data", "Cliente", "Valor", "Forma de pagamento", "Motorista", "Situação"];
  const linhas = itens.map((item) =>
    [
      item.numero,
      item.data,
      item.cliente,
      item.valor,
      FORMA_PAGAMENTO_LABEL[item.formaPagamento],
      item.motoboy ?? "",
      STATUS_LABEL[item.status],
    ]
      .map(celulaCsv)
      .join(",")
  );

  // BOM UTF-8 no início: sem isso o Excel (bem comum aqui, ver pt-BR) lê
  // acentos como caracteres corrompidos ao abrir o CSV direto.
  const csv = "﻿" + [cabecalho.join(","), ...linhas].join("\r\n") + "\r\n";

  const nomeArquivo = `relatorio-entregas${dataInicio ? `_${dataInicio}` : ""}${dataFim ? `_a_${dataFim}` : ""}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
    },
  });
}
