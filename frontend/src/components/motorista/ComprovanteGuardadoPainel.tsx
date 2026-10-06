"use client";

import { useState } from "react";
import { AlertTriangle, CloudOff, Loader2, RefreshCw } from "lucide-react";
import type { RascunhoVisivel } from "@/components/motorista/useRascunhosComprovante";

/**
 * Mostra um comprovante que está guardado no aparelho esperando envio (ou
 * recusado pelo servidor), com as miniaturas da foto e da assinatura para o
 * motorista ter certeza de que nada se perdeu.
 */
export function ComprovanteGuardadoPainel({
  rascunho,
  enviando,
  onEnviarAgora,
  onDescartar,
}: {
  rascunho: RascunhoVisivel;
  enviando: boolean;
  onEnviarAgora: () => void;
  onDescartar: () => void;
}) {
  const [confirmandoDescarte, setConfirmandoDescarte] = useState(false);

  return (
    <div className="p-4">
      <div
        className={`rounded-2xl border px-4 py-3 ${
          rascunho.rejeitado
            ? "border-red-200 bg-red-50"
            : "border-amber-200 bg-amber-50"
        }`}
        role="status"
      >
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-full ${
              rascunho.rejeitado
                ? "bg-red-100 text-red-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {enviando ? (
              <Loader2 className="size-5 animate-spin" />
            ) : rascunho.rejeitado ? (
              <AlertTriangle className="size-5" />
            ) : (
              <CloudOff className="size-5" />
            )}
          </span>

          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900">
              {enviando
                ? "Enviando comprovante..."
                : rascunho.rejeitado
                  ? "O servidor não aceitou o comprovante"
                  : "Comprovante guardado neste aparelho"}
            </p>
            <p className="mt-1 text-xs font-medium leading-5 text-slate-600">
              {rascunho.rejeitado
                ? (rascunho.mensagem ??
                  "Confira a entrega com a loja antes de enviar de novo.")
                : "A foto e a assinatura estão salvas. Vamos enviar sozinhos assim que o sinal voltar — pode seguir para a próxima entrega."}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={rascunho.fotoUrl}
            alt="Foto da entrega guardada"
            className="h-28 w-full object-cover"
          />
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={rascunho.assinaturaUrl}
            alt="Assinatura guardada"
            className="h-28 w-full object-contain p-2"
          />
        </div>
      </div>

      <button
        type="button"
        disabled={enviando}
        onClick={onEnviarAgora}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#15924A] px-4 py-3.5 text-sm font-black text-white transition hover:bg-[#117D3F] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {enviando ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <RefreshCw className="size-4" />
            {rascunho.rejeitado ? "Tentar enviar de novo" : "Enviar agora"}
          </>
        )}
      </button>

      {confirmandoDescarte ? (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-3 py-3">
          <p className="text-xs font-semibold text-slate-700">
            Apagar a foto e a assinatura guardadas e refazer a entrega do zero?
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setConfirmandoDescarte(false)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-black text-slate-700"
            >
              Manter
            </button>
            <button
              type="button"
              disabled={enviando}
              onClick={onDescartar}
              className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
            >
              Apagar e refazer
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={enviando}
          onClick={() => setConfirmandoDescarte(true)}
          className="mt-3 w-full text-center text-xs font-bold text-slate-500 underline-offset-2 hover:underline disabled:opacity-50"
        >
          Descartar e refazer
        </button>
      )}
    </div>
  );
}
