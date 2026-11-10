import { NextRequest, NextResponse } from "next/server";
import { getRelatorioEntregas } from "@/lib/data/entregas";
import { obterSessaoOperador, setorIdParaFiltro } from "@/lib/sessao-operador";
import { linhaCsv, SEPARADOR_CSV } from "@/lib/csv";
import { arquivarRelatorioCsv } from "@/lib/relatorios-storage";
import { obterAdminAutenticado } from "@/lib/admin-auth";
import {
  FORMA_PAGAMENTO_LABEL,
  SITUACAO_LABEL,
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
export async function GET(request: NextRequest) {
  // Autenticação própria: o proxy só confere a assinatura do cookie e o
  // relatório carrega dados financeiros — exige sessão válida e aplica o
  // escopo de setor do gestor_setor.
  const sessao = await obterSessaoOperador();
  if (!sessao) {
    return new NextResponse("Não autorizado.", {
      status: 401,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  const params = request.nextUrl.searchParams;

  const inicioParam = params.get("inicio");
  const fimParam = params.get("fim");
  const statusParam = params.get("status");
  const formaParam = params.get("forma");
  const motoristaParam = params.get("motorista");
  const unidadeParam = params.get("unidade");
  const unidadeId =
    unidadeParam && /^[0-9a-f-]{36}$/i.test(unidadeParam) ? unidadeParam : undefined;
  const busca = (params.get("q") ?? "").trim().slice(0, 80);

  const dataInicio = isDataIsoValida(inicioParam) ? inicioParam : undefined;
  const dataFim = isDataIsoValida(fimParam) ? fimParam : undefined;
  const status = isStatusEntrega(statusParam) ? statusParam : undefined;
  const formaPagamento = isFormaPagamento(formaParam) ? formaParam : undefined;
  const motoboyId =
    motoristaParam && /^[0-9a-f-]{36}$/i.test(motoristaParam)
      ? motoristaParam
      : undefined;

  const { itens } = await getRelatorioEntregas({
    dataInicio,
    dataFim,
    status,
    formaPagamento,
    motoboyId,
    busca,
    unidadeId,
    setorId: setorIdParaFiltro(sessao),
  });

  // Valor como número ("45,00", sem "R$"): o Excel em português soma a coluna.
  const cabecalho = [
    "Código",
    "Data",
    "Cliente",
    "Telefone",
    "Endereço",
    "NF-e",
    "Pedido",
    "Valor (R$)",
    "Unidade",
    "Forma de pagamento",
    "Motorista",
    "Situação",
    "Saída",
    "Concluída em",
  ];
  const linhas = itens.map((item) =>
    linhaCsv([
      item.numero,
      item.data,
      item.cliente,
      item.telefone ?? "",
      item.endereco ?? "",
      item.numeroNfe ?? "",
      item.numeroPedido ?? "",
      item.valorNumerico.toFixed(2).replace(".", ","),
      item.unidade ?? "",
      FORMA_PAGAMENTO_LABEL[item.formaPagamento],
      item.motoboy ?? "",
      SITUACAO_LABEL[item.situacao],
      item.horaSaida ?? "",
      item.concluidaEm ?? "",
    ])
  );

  // BOM UTF-8 no início: sem isso o Excel (bem comum aqui, ver pt-BR) lê
  // acentos como caracteres corrompidos ao abrir o CSV direto.
  const csv = "﻿" + [cabecalho.join(SEPARADOR_CSV), ...linhas].join("\r\n") + "\r\n";

  const nomeBase = `relatorio-entregas${dataInicio ? `_${dataInicio}` : ""}${dataFim ? `_a_${dataFim}` : ""}`;
  const nomeArquivo = `${nomeBase}.csv`;

  // O arquivamento em disco é uma cópia de segurança: se falhar (disco
  // cheio, permissão), o usuário ainda recebe o relatório — só registramos
  // o erro para a manutenção ver.
  try {
    await arquivarRelatorioCsv(nomeBase, csv);
  } catch (error) {
    let usuario = "indisponivel";
    try {
      const email = (await obterAdminAutenticado())?.email;
      usuario = email ? encodeURIComponent(email) : usuario;
    } catch {
      // A falha ao consultar a identidade também não deve impedir o download.
    }
    const codigoErro =
      typeof error === "object" && error !== null && "code" in error &&
      typeof error.code === "string" && /^[A-Z0-9_]+$/.test(error.code)
        ? error.code
        : error instanceof Error
          ? error.name
          : "ErroDesconhecido";
    console.error(
      `[CSV_ARCHIVE_FAILED] data_hora=${new Date().toISOString()} usuario=${usuario} motivo=${codigoErro}`
    );
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
