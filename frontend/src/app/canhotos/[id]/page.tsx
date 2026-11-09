import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  History,
  MapPin,
  Package,
  PenLine,
  ReceiptText,
  SquarePen,
  UserRound,
} from "lucide-react";
import {
  getComprovantesEntrega,
  getDocumentosEntrega,
  getEntregaById,
  getHistoricoEntrega,
  type EntregaComprovante,
} from "@/lib/data/entregas";
import { formatBRL, formatDateBR } from "@/lib/format";
import {
  obterSessaoOperador,
  sessaoPodeAcessarSetor,
} from "@/lib/sessao-operador";
import {
  FORMA_PAGAMENTO_LABEL,
  SITUACAO_TEXT_CLASSES,
  SITUACAO_LABEL,
  situacaoEntrega,
  STATUS_LABEL,
} from "@/lib/status";
import { CancelarEntregaBotao } from "@/components/canhotos/CancelarEntregaBotao";

export const dynamic = "force-dynamic";

// CORREÇÃO (hora errada no canhoto): esta página é um Server Component —
// `toLocaleString` roda no processo Node do servidor, não no navegador do
// usuário. Sem `timeZone` explícito, o Intl usa o fuso do SERVIDOR (TZ não
// configurado em docker-compose.yml/.env.example — default UTC em
// container), não o fuso de Brasília, então hora/alteradoEm e
// capturadoEm apareciam ~3h adiantados. Mesmo fuso já usado em
// frontend/src/lib/data/entregas.ts (FUSO_LOJA = "America/Sao_Paulo").
function formatarDataHora(valor: string): string {
  return new Date(valor).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
}

export default async function EntregaDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ voltar?: string }>;
}) {
  const sessao = await obterSessaoOperador();
  if (!sessao) redirect("/login");

  const { id } = await params;
  // Quem chegou pelos Relatórios volta para eles, com os mesmos filtros. Só
  // aceita caminho interno de /relatorios (nada de endereço de outro site).
  const { voltar } = await searchParams;
  const veioDosRelatorios =
    typeof voltar === "string" && /^\/relatorios\?[\w=&%.-]{0,300}$/.test(voltar);
  const [entrega, comprovantes, documentos, historico] = await Promise.all([
    getEntregaById(id),
    getComprovantesEntrega(id),
    getDocumentosEntrega(id),
    getHistoricoEntrega(id),
  ]);

  if (!entrega || !sessaoPodeAcessarSetor(sessao, entrega.setorId)) notFound();

  // Entrega concluída só o Admin edita (ver editar/actions.ts).
  const podeEditar = sessao.tipo === "admin" || entrega.status !== "entregue";
  const situacao = situacaoEntrega(entrega.status, entrega.horaSaida);

  const fotos = comprovantes.filter((item) => item.tipo === "foto");
  const comprovantesPix = comprovantes.filter(
    (item) => item.tipo === "comprovante_pix"
  );
  const fotosProduto = comprovantes.filter(
    (item) => item.tipo === "foto_produto"
  );
  const assinaturas = comprovantes.filter(
    (item) => item.tipo === "assinatura_cliente"
  );

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href={veioDosRelatorios ? voltar! : "/canhotos"}
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-[#0A1F44]"
          >
            <ArrowLeft className="size-4" />
            {veioDosRelatorios ? "Voltar para Relatórios" : "Voltar para Entregas"}
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Entrega #{entrega.numero}
            </h1>
            <span
              className={`flex items-center gap-2 whitespace-nowrap text-sm font-semibold ${SITUACAO_TEXT_CLASSES[situacao]}`}
            >
              {SITUACAO_LABEL[situacao]}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {entrega.status === "pendente" && (
            <CancelarEntregaBotao
              id={entrega.id}
              numero={`#${entrega.numero}`}
              cliente={entrega.clienteNome}
            />
          )}
          {podeEditar && (
            <Link
              href={`/canhotos/${entrega.id}/editar`}
              prefetch={false}
              className="inline-flex items-center gap-2 bg-[#0A1F44] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#0A1F44]/90"
            >
              <SquarePen className="size-4" />
              Editar entrega
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <section className="col-span-12 border border-slate-200 bg-white shadow-sm xl:col-span-5">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-[15px] font-bold text-[#0A1F44]">
              Dados da entrega
            </h2>
          </div>

          <dl className="divide-y divide-slate-100 px-6">
            <div className="grid grid-cols-[130px_1fr] gap-4 py-3.5 text-sm">
              <dt className="font-semibold text-slate-500">Data</dt>
              <dd className="font-medium text-slate-800">
                {formatDateBR(entrega.data)}
              </dd>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-4 py-3.5 text-sm">
              <dt className="font-semibold text-slate-500">Cliente</dt>
              <dd className="font-medium text-slate-800">
                {entrega.clienteNome}
              </dd>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-4 py-3.5 text-sm">
              <dt className="font-semibold text-slate-500">Telefone</dt>
              <dd className="font-medium text-slate-800">
                {entrega.clienteTelefone || "—"}
              </dd>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-4 py-3.5 text-sm">
              <dt className="font-semibold text-slate-500">Pedido</dt>
              <dd className="font-medium text-slate-800">
                {entrega.numeroPedido || "—"}
              </dd>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-4 py-3.5 text-sm">
              <dt className="font-semibold text-slate-500">NF-e</dt>
              <dd className="font-medium text-slate-800">
                {entrega.numeroNfe || "—"}
              </dd>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-4 py-3.5 text-sm">
              <dt className="font-semibold text-slate-500">Valor</dt>
              <dd className="font-bold text-slate-900">
                {formatBRL(Number(entrega.valorPagamento))}
              </dd>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-4 py-3.5 text-sm">
              <dt className="font-semibold text-slate-500">Pagamento</dt>
              <dd className="font-medium text-slate-800">
                {FORMA_PAGAMENTO_LABEL[entrega.formaPagamento]}
              </dd>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-4 py-3.5 text-sm">
              <dt className="font-semibold text-slate-500">Motorista</dt>
              <dd className="flex items-center gap-2 font-medium text-slate-800">
                <UserRound className="size-4 text-slate-400" />
                {entrega.motoboyNome || "Não informado"}
              </dd>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-4 py-3.5 text-sm">
              <dt className="font-semibold text-slate-500">
                Horário de saída
              </dt>
              <dd>
                {entrega.horaSaida ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-900">
                    <Clock3 className="size-4 text-slate-400" />
                    {entrega.horaSaida.slice(0, 5)}
                  </span>
                ) : (
                  <span className="font-medium text-slate-300">
                    Ainda não saiu
                  </span>
                )}
              </dd>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-4 py-3.5 text-sm">
              <dt className="font-semibold text-slate-500">Endereço</dt>
              <dd className="flex items-start gap-2 font-medium text-slate-800">
                <MapPin className="mt-0.5 size-4 shrink-0 text-slate-400" />
                <span>{entrega.endereco || "—"}</span>
              </dd>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-4 py-3.5 text-sm">
              <dt className="font-semibold text-slate-500">CEP</dt>
              <dd className="font-medium text-slate-800">
                {entrega.cep || "—"}
              </dd>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-4 py-3.5 text-sm">
              <dt className="font-semibold text-slate-500">Observações</dt>
              <dd className="whitespace-pre-wrap font-medium text-slate-800">
                {entrega.observacoes || "—"}
              </dd>
            </div>
            {documentos.length > 0 && (
              <div className="grid grid-cols-[130px_1fr] gap-4 py-3.5 text-sm">
                <dt className="font-semibold text-slate-500">Documentos</dt>
                <dd className="flex flex-col items-start gap-2">
                  {documentos.map((doc) => (
                    <a
                      key={doc.id}
                      href={`/api/entregas/anexos/${doc.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 font-semibold text-[#1768D8] hover:underline"
                    >
                      {doc.tipo === "danfe_pdf" ? (
                        <FileText className="size-4" />
                      ) : (
                        <Download className="size-4" />
                      )}
                      {doc.tipo === "danfe_pdf"
                        ? "PDF da nota (DANFE)"
                        : doc.tipo === "xml_cte"
                          ? "XML do CT-e"
                          : "XML da NF-e"}
                    </a>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </section>

        <section className="col-span-12 border border-slate-200 bg-white shadow-sm xl:col-span-7">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-[15px] font-bold text-[#0A1F44]">
              Comprovante de entrega
            </h2>
          </div>

          {comprovantes.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto grid size-11 place-items-center rounded-full bg-slate-100 text-slate-400">
                <Camera className="size-5" />
              </div>
              <p className="mt-3 text-sm font-bold text-slate-700">
                Nenhum comprovante registrado
              </p>
              <p className="mt-1 text-sm text-slate-500">
                A foto da entrega aparecerá aqui após a conclusão pelo motorista.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 p-6 md:grid-cols-2">
              <BlocoComprovante
                titulo="Foto da entrega"
                icone={<Camera className="size-4 text-[#0A1F44]" />}
                itens={fotos}
                alt="Foto da entrega"
                vazio="Foto não registrada."
              />
              {fotosProduto.length > 0 && (
                <BlocoComprovante
                  titulo={fotosProduto.length > 1 ? "Fotos do produto" : "Foto do produto"}
                  icone={<Package className="size-4 text-[#0A1F44]" />}
                  itens={fotosProduto}
                  alt="Foto do produto"
                />
              )}
              {comprovantesPix.length > 0 && (
                <BlocoComprovante
                  titulo="Comprovante Pix"
                  icone={<ReceiptText className="size-4 text-[#0A1F44]" />}
                  itens={comprovantesPix}
                  alt="Comprovante de pagamento Pix"
                />
              )}
              {/* Entregas antigas: a assinatura não é mais coletada, mas as já
                  gravadas continuam disponíveis. */}
              {assinaturas.length > 0 && (
                <BlocoComprovante
                  titulo="Assinatura do cliente"
                  icone={<PenLine className="size-4 text-[#0A1F44]" />}
                  itens={assinaturas}
                  alt="Assinatura do cliente"
                  fundoBranco
                />
              )}
            </div>
          )}
        </section>

        <section className="col-span-12 border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="flex items-center gap-2 text-[15px] font-bold text-[#0A1F44]">
              <History className="size-4" />
              Histórico
            </h2>
          </div>

          {historico.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-slate-400">
              Nenhuma alteração registrada.
            </p>
          ) : (
            <ol className="divide-y divide-slate-100 px-6">
              {historico.map((item) => (
                <li
                  key={item.id}
                  className="grid gap-1 py-3.5 text-sm sm:grid-cols-[150px_1fr]"
                >
                  <span className="text-xs font-semibold text-slate-500">
                    {formatarDataHora(item.alteradoEm)}
                  </span>
                  <div>
                    <p className="font-semibold text-slate-800">
                      {item.responsavel}
                      {item.statusAnterior !== item.statusNovo && (
                        <span className="font-medium text-slate-500">
                          {" "}
                          · {item.statusAnterior ? `${STATUS_LABEL[item.statusAnterior]} → ` : ""}
                          {STATUS_LABEL[item.statusNovo]}
                        </span>
                      )}
                    </p>
                    {item.observacao && (
                      <p className="mt-0.5 text-slate-600">{item.observacao}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

function BlocoComprovante({
  titulo,
  icone,
  itens,
  alt,
  vazio,
  fundoBranco = false,
}: {
  titulo: string;
  icone: ReactNode;
  itens: EntregaComprovante[];
  alt: string;
  vazio?: string;
  fundoBranco?: boolean;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        {icone}
        <h3 className="text-sm font-bold text-slate-800">{titulo}</h3>
      </div>

      {itens.length > 0 ? (
        <div className="space-y-4">
          {itens.map((item) => (
            <div key={item.id}>
              <a
                href={`/api/entregas/anexos/${item.id}`}
                target="_blank"
                rel="noreferrer"
                className={`block overflow-hidden border border-slate-200 ${fundoBranco ? "bg-white" : "bg-slate-50"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/entregas/anexos/${item.id}`}
                  alt={alt}
                  className={`h-64 w-full object-contain ${fundoBranco ? "p-4" : ""}`}
                />
              </a>
              <div className="mt-2 flex items-start justify-between gap-3 text-xs text-slate-500">
                <div>
                  <p>
                    {item.capturadoPorMotoboy
                      ? `Enviado por ${item.capturadoPorMotoboy}`
                      : "Motorista não identificado"}
                  </p>
                  <p>{formatarDataHora(item.capturadoEm)}</p>
                </div>
                <a
                  href={`/api/entregas/anexos/${item.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-[#0A1F44] hover:underline"
                >
                  Ampliar
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-400">
          {vazio}
        </p>
      )}
    </div>
  );
}
