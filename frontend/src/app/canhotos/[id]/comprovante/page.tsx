import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { codigoVerificacao } from "@/lib/comprovante-integridade";
import { getAnexosComIntegridade } from "@/lib/data/comprovante-juridico";
import { getEntregaById, getHistoricoEntrega } from "@/lib/data/entregas";
import { formatBRL, formatDateBR } from "@/lib/format";
import {
  obterSessaoOperador,
  sessaoPodeAcessarSetor,
} from "@/lib/sessao-operador";
import { FORMA_PAGAMENTO_LABEL } from "@/lib/status";
import { BotaoImprimir } from "@/components/canhotos/BotaoImprimir";

export const dynamic = "force-dynamic";

const FONTE_DOCUMENTO = '"Times New Roman", Times, serif';

const ROTULO_TIPO = {
  foto: "Foto do canhoto assinado",
  foto_produto: "Foto do produto",
  comprovante_pix: "Comprovante Pix",
} as const;

const ROTULO_SITUACAO = {
  conferido: "Conferido: arquivo idêntico ao recebido",
  divergente: "DIVERGENTE: arquivo alterado após o envio",
  sem_registro: "Sem impressão digital (anexo anterior ao registro)",
  arquivo_ausente: "Arquivo não encontrado no armazenamento",
} as const;

function dataHora(valor: string): string {
  return new Date(valor).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "America/Sao_Paulo",
  });
}

export default async function ComprovanteEntregaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const sessao = await obterSessaoOperador();
  if (!sessao) redirect("/login");

  const { id } = await params;
  const [entrega, anexos, historico] = await Promise.all([
    getEntregaById(id),
    getAnexosComIntegridade(id),
    getHistoricoEntrega(id),
  ]);

  if (!entrega || !sessaoPodeAcessarSetor(sessao, entrega.setorId)) notFound();
  if (entrega.status !== "entregue" || !entrega.concluidaEm) notFound();

  const codigo = codigoVerificacao({
    entregaId: entrega.id,
    numeroPedido: entrega.numeroPedido,
    numeroNfe: entrega.numeroNfe,
    recebedorNome: entrega.recebedorNome ?? "",
    concluidaEm: entrega.concluidaEm,
    motoboyNome: entrega.motoboyNome,
    hashesAnexos: anexos.flatMap((anexo) => (anexo.sha256 ? [anexo.sha256] : [])),
  });

  const fotoCanhoto = anexos.find((anexo) => anexo.tipo === "foto");
  const todosConferidos =
    anexos.length > 0 && anexos.every((anexo) => anexo.situacao === "conferido");

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex items-center justify-between gap-3 print:hidden">
        <Link
          href={`/canhotos/${entrega.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-[#0A1F44]"
        >
          <ArrowLeft className="size-4" />
          Voltar para a entrega
        </Link>
        <BotaoImprimir />
      </div>

      <article
        style={{ fontFamily: FONTE_DOCUMENTO }}
        className="border border-slate-300 bg-white p-8 text-slate-900 print:border-0 print:p-0"
      >
        <header className="border-b-2 border-slate-900 pb-4">
          {/* PNG colorido sobre fundo branco: imprime igual ao da tela. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/rildon-express-logo.png"
            alt="Rildon Express"
            width={900}
            height={116}
            className="mb-3 h-8 w-auto"
          />
          <h1 className="text-xl font-black uppercase tracking-wide">
            Comprovante de Entrega
          </h1>
          <p className="mt-1 text-xs text-slate-600">
            Emitido em {dataHora(new Date().toISOString())}.
          </p>
        </header>

        <section className="mt-5">
          <h2 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">
            Identificação
          </h2>
          <dl className="grid grid-cols-[170px_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="font-semibold">Entrega nº</dt>
            <dd>#{entrega.numero}</dd>
            <dt className="font-semibold">Pedido</dt>
            <dd>{entrega.numeroPedido || "—"}</dd>
            <dt className="font-semibold">Nota fiscal (NF-e)</dt>
            <dd>
              {entrega.numeroNfe ||
                (entrega.clienteFinal ? "Venda a consumidor final (sem NF-e)" : "—")}
            </dd>
            <dt className="font-semibold">Cliente</dt>
            <dd>{entrega.clienteNome}</dd>
            <dt className="font-semibold">Endereço de entrega</dt>
            <dd>{entrega.endereco || "—"}</dd>
            <dt className="font-semibold">Valor / pagamento</dt>
            <dd>
              {formatBRL(Number(entrega.valorPagamento))} ·{" "}
              {FORMA_PAGAMENTO_LABEL[entrega.formaPagamento]}
            </dd>
            <dt className="font-semibold">Data do pedido</dt>
            <dd>{formatDateBR(entrega.data)}</dd>
          </dl>
        </section>

        <section className="mt-5">
          <h2 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">
            Recebimento
          </h2>
          <dl className="grid grid-cols-[170px_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="font-semibold">Recebido por</dt>
            <dd className="font-bold">
              {entrega.recebedorNome ?? "Não registrado (entrega anterior ao registro)"}
            </dd>
            <dt className="font-semibold">Data e hora da entrega</dt>
            <dd>{dataHora(entrega.concluidaEm)} (horário de Brasília)</dd>
            <dt className="font-semibold">Entregador</dt>
            <dd>{entrega.motoboyNome || "—"}</dd>
          </dl>
        </section>

        <section className="mt-5">
          <h2 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">
            Canhoto assinado (imagem)
          </h2>
          {fotoCanhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/entregas/anexos/${fotoCanhoto.id}`}
              alt="Foto do canhoto assinado"
              className="max-h-[420px] w-full border border-slate-300 object-contain"
            />
          ) : (
            <p className="text-sm text-slate-500">Imagem não encontrada.</p>
          )}
        </section>

        <section className="mt-5 break-inside-avoid">
          <h2 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">
            Integridade dos arquivos
          </h2>
          <table className="w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-slate-400 text-left">
                <th className="py-1 pr-2">Arquivo</th>
                <th className="py-1 pr-2">Enviado em</th>
                <th className="py-1 pr-2">SHA-256 registrado</th>
                <th className="py-1">Situação</th>
              </tr>
            </thead>
            <tbody>
              {anexos.map((anexo) => (
                <tr key={anexo.id} className="border-b border-slate-200 align-top">
                  <td className="py-1 pr-2">{ROTULO_TIPO[anexo.tipo]}</td>
                  <td className="py-1 pr-2">{dataHora(anexo.capturadoEm)}</td>
                  <td className="break-all py-1 pr-2 font-mono text-[9px]">
                    {anexo.sha256 ?? "—"}
                  </td>
                  <td className="py-1">{ROTULO_SITUACAO[anexo.situacao]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs font-semibold">
            {todosConferidos
              ? "Todos os arquivos foram reconferidos agora e permanecem idênticos aos recebidos no momento da entrega."
              : "Atenção: ao menos um arquivo não pôde ser conferido (veja a coluna Situação)."}
          </p>
        </section>

        <section className="mt-5 break-inside-avoid">
          <h2 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">
            Trilha de registro
          </h2>
          <ul className="space-y-1 text-xs">
            {historico.map((item) => (
              <li key={item.id}>
                {dataHora(item.alteradoEm)} — {item.responsavel}:{" "}
                {item.observacao ?? "Alteração de status"}
              </li>
            ))}
          </ul>
        </section>

        <footer className="mt-6 break-inside-avoid border-t border-slate-300 pt-3">
          <p className="text-xs font-semibold">Código de verificação do comprovante</p>
          <p className="break-all font-mono text-[10px]">{codigo}</p>
          <p className="mt-2 text-[10px] text-slate-500">
            O código resume os dados deste comprovante e as impressões digitais
            dos arquivos. Qualquer alteração nos dados ou nas imagens gera um
            código diferente.
          </p>
        </footer>
      </article>
    </div>
  );
}
