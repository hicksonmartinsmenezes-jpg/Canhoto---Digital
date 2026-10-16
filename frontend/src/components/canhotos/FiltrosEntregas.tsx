"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { SITUACAO_LABEL, type SituacaoEntrega } from "@/lib/status";
import { CampoPeriodo } from "@/components/ui/CampoPeriodo";
import type { MotoboyOption } from "@/lib/data/motoboys";

// Entregue e cancelado não aparecem aqui: ficam em Relatórios.
const SITUACOES: SituacaoEntrega[] = ["aguardando", "em_rota"];

const CAMPO =
  "rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-700 outline-none transition-colors focus:border-slate-400";

/**
 * Filtros da lista de Entregas. Formulário GET comum (a URL guarda o filtro e
 * o voltar do navegador funciona); as listas e datas aplicam sozinhas ao
 * mudar, a busca aplica ao apertar Enter ou no botão.
 */
export function FiltrosEntregas({
  valores,
  motoboys,
  temFiltro,
}: {
  valores: {
    busca: string;
    situacao: string;
    motoboyId: string;
    dataInicio: string;
    dataFim: string;
  };
  motoboys: MotoboyOption[];
  temFiltro: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const aplicar = () => formRef.current?.requestSubmit();

  // Monta a URL só com os filtros preenchidos (sem "?q=&motorista=&de=...").
  function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const params = new URLSearchParams();
    for (const [chave, valor] of new FormData(evento.currentTarget)) {
      if (typeof valor !== "string") continue;
      // As datas vão sempre na URL, mesmo vazias: "de=&ate=" significa "todos
      // os dias" (sem elas a lista volta a abrir no dia de hoje).
      if (chave === "de" || chave === "ate" || valor.trim()) {
        params.set(chave, valor.trim());
      }
    }
    const qs = params.toString();
    router.push(`/canhotos?${qs}`);
  }

  return (
    <form
      ref={formRef}
      role="search"
      onSubmit={aoEnviar}
      className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_auto_auto_auto_auto] lg:items-end"
    >
      <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
        Buscar
        <span className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            name="q"
            defaultValue={valores.busca}
            placeholder="Cliente, NF-e, pedido ou #nº"
            className={`${CAMPO} w-full pl-9 normal-case tracking-normal`}
          />
        </span>
      </label>

      <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
        Situação
        <select
          name="situacao"
          defaultValue={valores.situacao}
          onChange={aplicar}
          className={`${CAMPO} normal-case tracking-normal`}
        >
          <option value="">Todas</option>
          {SITUACOES.map((s) => (
            <option key={s} value={s}>
              {SITUACAO_LABEL[s]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">
        Motorista
        <select
          name="motorista"
          defaultValue={valores.motoboyId}
          onChange={aplicar}
          className={`${CAMPO} normal-case tracking-normal`}
        >
          <option value="">Todos</option>
          {motoboys.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </select>
      </label>

      <CampoPeriodo
        nomeInicio="de"
        nomeFim="ate"
        valorInicio={valores.dataInicio}
        valorFim={valores.dataFim}
        onChange={aplicar}
        className="gap-1 text-[11px] font-bold uppercase tracking-wide text-slate-500"
      />

      <div className="flex items-end gap-2">
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-none bg-[#0A1F44] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0A1F44]/90 active:scale-[0.97]"
        >
          <Search className="size-4" />
          Buscar
        </button>
        {temFiltro && (
          <Link
            href="/canhotos"
            prefetch={false}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-500/40 hover:text-red-600"
          >
            <X className="size-4" />
            Limpar
          </Link>
        )}
      </div>
    </form>
  );
}
