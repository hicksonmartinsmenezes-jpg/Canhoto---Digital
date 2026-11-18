import Image from "next/image";
import { CheckCircle2, ShieldAlert, ShieldQuestion } from "lucide-react";
import { getVerificacaoPorCodigo } from "@/lib/data/comprovante-juridico";
import { checarRateLimit } from "@/lib/rate-limit";
import { rotuloNfe } from "@/lib/format";

export const metadata = {
  title: "Verificar comprovante | Rildon Express",
  robots: { index: false, follow: false },
};

const CODIGO_VALIDO = /^[0-9a-f]{64}$/;

function dataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "medium",
  });
}

export default async function VerificarPage({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string | string[] }>;
}) {
  const params = await searchParams;
  const bruto = Array.isArray(params.codigo) ? params.codigo[0] : params.codigo;
  const codigo = (bruto ?? "").replace(/\s+/g, "").toLowerCase();

  let estado:
    | { tipo: "vazio" }
    | { tipo: "invalido" }
    | { tipo: "limite" }
    | { tipo: "naoEncontrado" }
    | {
        tipo: "encontrado";
        dados: NonNullable<Awaited<ReturnType<typeof getVerificacaoPorCodigo>>>;
      } = { tipo: "vazio" };

  if (codigo) {
    if (!CODIGO_VALIDO.test(codigo)) {
      estado = { tipo: "invalido" };
    } else if (!(await checarRateLimit("verificarCodigo", 20)).permitido) {
      estado = { tipo: "limite" };
    } else {
      const dados = await getVerificacaoPorCodigo(codigo);
      estado = dados ? { tipo: "encontrado", dados } : { tipo: "naoEncontrado" };
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Image
        src="/rildon-express-logo.png"
        alt="Rildon Express"
        width={160}
        height={40}
        className="mb-6 h-10 w-auto"
        priority
      />
      <h1 className="text-2xl font-black text-[#0A1F44]">
        Verificar comprovante de entrega
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        Digite o código de verificação que aparece no rodapé do comprovante para
        conferir se ele foi emitido pelo sistema e se os registros continuam
        iguais.
      </p>

      <form method="get" className="mt-5 flex flex-col gap-3">
        <label htmlFor="codigo" className="text-xs font-black uppercase tracking-wider text-slate-500">
          Código de verificação
        </label>
        <input
          id="codigo"
          name="codigo"
          type="text"
          defaultValue={bruto ?? ""}
          autoComplete="off"
          spellCheck={false}
          maxLength={80}
          placeholder="64 caracteres (0-9 e a-f)"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-mono text-xs text-slate-800 outline-none focus:border-[#0A1F44]"
        />
        <button
          type="submit"
          className="rounded-xl bg-[#0A1F44] px-4 py-3 text-sm font-bold text-white hover:bg-[#12306b]"
        >
          Verificar
        </button>
      </form>

      {estado.tipo === "invalido" && (
        <Aviso icone="aviso" titulo="Código em formato inválido">
          O código tem 64 caracteres, só com números de 0 a 9 e letras de a até f.
          Confira se foi copiado inteiro.
        </Aviso>
      )}

      {estado.tipo === "limite" && (
        <Aviso icone="aviso" titulo="Muitas consultas">
          Aguarde um minuto e tente novamente.
        </Aviso>
      )}

      {estado.tipo === "naoEncontrado" && (
        <Aviso icone="duvida" titulo="Código não encontrado">
          Nenhum comprovante registrado com esse código. Comprovantes emitidos
          antes deste recurso só ficam disponíveis depois que são abertos uma
          vez no sistema; peça a quem emitiu para abri-lo e tente de novo.
        </Aviso>
      )}

      {estado.tipo === "encontrado" && (
        <ResultadoVerificacao dados={estado.dados} />
      )}
    </div>
  );
}

function Aviso({
  icone,
  titulo,
  children,
}: {
  icone: "aviso" | "duvida";
  titulo: string;
  children: React.ReactNode;
}) {
  const Icone = icone === "aviso" ? ShieldAlert : ShieldQuestion;
  return (
    <div className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <Icone className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div>
        <p className="font-bold">{titulo}</p>
        <p className="mt-1">{children}</p>
      </div>
    </div>
  );
}

function ResultadoVerificacao({
  dados,
}: {
  dados: NonNullable<Awaited<ReturnType<typeof getVerificacaoPorCodigo>>>;
}) {
  const arquivosOk = dados.anexos.every((anexo) => anexo.situacao === "conferido");
  const semRegistro = dados.anexos.some((anexo) => anexo.situacao === "sem_registro");
  const tudoOk = arquivosOk && dados.dadosConferem;
  const nfe = rotuloNfe(dados.numeroNfe, dados.clienteFinal) ?? "Não informada";

  return (
    <div className="mt-6 space-y-4">
      <div
        className={`flex gap-3 rounded-2xl border p-4 text-sm ${
          tudoOk
            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
            : "border-amber-200 bg-amber-50 text-amber-900"
        }`}
      >
        {tudoOk ? (
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        ) : (
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        )}
        <div>
          <p className="font-bold">
            {tudoOk
              ? "Comprovante registrado e íntegro"
              : "Comprovante registrado, mas há divergências"}
          </p>
          <ul className="mt-1 list-disc pl-5">
            <li>
              {dados.dadosConferem
                ? "O registro da entrega continua igual ao da conclusão."
                : "O registro da entrega foi alterado depois da conclusão."}
            </li>
            <li>
              {arquivosOk
                ? "Os arquivos guardados conferem com a impressão digital registrada."
                : semRegistro
                  ? "Há arquivos anteriores ao registro de impressão digital ou que não conferem."
                  : "Algum arquivo guardado não confere com a impressão digital registrada."}
            </li>
          </ul>
        </div>
      </div>

      <dl className="grid grid-cols-[150px_1fr] gap-x-4 gap-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
        <dt className="font-semibold text-slate-500">Entrega nº</dt>
        <dd>#{dados.entregaNumero}</dd>
        <dt className="font-semibold text-slate-500">Pedido</dt>
        <dd>{dados.numeroPedido || "Não informado"}</dd>
        <dt className="font-semibold text-slate-500">Nota fiscal (NF-e)</dt>
        <dd>{nfe}</dd>
        <dt className="font-semibold text-slate-500">Recebido por</dt>
        <dd className="font-bold">{dados.recebedorNome || "Não registrado"}</dd>
        {dados.recebedorVinculo && (
          <>
            <dt className="font-semibold text-slate-500">Empresa ou vínculo</dt>
            <dd>{dados.recebedorVinculo}</dd>
          </>
        )}
        <dt className="font-semibold text-slate-500">Data e hora</dt>
        <dd>{dataHora(dados.concluidaEm)} (horário de Brasília)</dd>
        <dt className="font-semibold text-slate-500">Entregador</dt>
        <dd>{dados.motoboyNome || "—"}</dd>
      </dl>
    </div>
  );
}
