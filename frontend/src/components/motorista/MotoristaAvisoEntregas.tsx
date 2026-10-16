"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BellRing, X } from "lucide-react";
import {
  calcularAvisos,
  mensagemDoAviso,
  type EntregaParaAviso,
  type EntregasVistas,
} from "@/lib/avisos-entregas";

const CHAVE_PREFIXO = "canhoto-motorista:entregas-vistas:";
const TEMPO_DO_AVISO_MS = 30_000;

function diaLocal(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

function lerVistas(chave: string): EntregasVistas | null {
  try {
    const bruto = window.localStorage.getItem(chave);
    if (!bruto) return null;
    const dados = JSON.parse(bruto) as Partial<EntregasVistas> | null;
    if (!dados || typeof dados.dia !== "string" || !Array.isArray(dados.pendentes)) {
      return null;
    }
    return dados as EntregasVistas;
  } catch {
    return null;
  }
}

function gravarVistas(chave: string, vistas: EntregasVistas) {
  try {
    window.localStorage.setItem(chave, JSON.stringify(vistas));
  } catch {
    // Sem armazenamento o aviso só deixa de lembrar o que já mostrou.
  }
}

/** Dois toques curtos. Pode ser bloqueado pelo navegador; nesse caso fica mudo. */
function tocarSom() {
  try {
    const Contexto =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Contexto) return;
    const contexto = new Contexto();
    const inicio = contexto.currentTime;
    [880, 1175].forEach((frequencia, indice) => {
      const oscilador = contexto.createOscillator();
      const volume = contexto.createGain();
      oscilador.type = "sine";
      oscilador.frequency.value = frequencia;
      const t0 = inicio + indice * 0.22;
      volume.gain.setValueAtTime(0.0001, t0);
      volume.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02);
      volume.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
      oscilador.connect(volume).connect(contexto.destination);
      oscilador.start(t0);
      oscilador.stop(t0 + 0.22);
    });
    window.setTimeout(() => void contexto.close().catch(() => {}), 1_000);
  } catch {
    // Sem som: o aviso na tela e a vibração continuam.
  }
}

function vibrar() {
  try {
    navigator.vibrate?.([220, 120, 220]);
  } catch {
    // Alguns aparelhos/navegadores não permitem.
  }
}

/**
 * Avisa na tela (com som e vibração) quando a lista do motorista ganha uma
 * entrega nova ou perde uma pendente. A lista é atualizada sozinha a cada 30 s
 * e quando o app volta ao primeiro plano; o push nativo cobre o app fechado.
 */
export function MotoristaAvisoEntregas({
  motoboyId,
  entregas,
}: {
  motoboyId: string;
  entregas: EntregaParaAviso[];
}) {
  const [aviso, setAviso] = useState<{
    titulo: string;
    detalhe: string;
    href: string | null;
  } | null>(null);
  const timerRef = useRef<number | null>(null);

  // Só reage quando a lista muda de verdade (nova atualização, não toda renderização).
  const assinatura = useMemo(
    () => entregas.map((e) => `${e.id}:${e.status}`).join("|"),
    [entregas]
  );

  useEffect(() => {
    const chave = `${CHAVE_PREFIXO}${motoboyId}`;
    const resultado = calcularAvisos(entregas, lerVistas(chave), diaLocal());
    gravarVistas(chave, resultado.vistas);

    const mensagem = mensagemDoAviso(resultado.novas, resultado.retiradas);
    if (!mensagem) return;

    tocarSom();
    vibrar();
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- o aviso nasce de comparar com o que o aparelho guardou (localStorage), só existe no cliente
    setAviso({
      ...mensagem,
      href:
        resultado.novas.length === 1
          ? `/motorista/entregas/${resultado.novas[0].id}`
          : null,
    });
    timerRef.current = window.setTimeout(() => setAviso(null), TEMPO_DO_AVISO_MS);
    // `entregas` muda de identidade a cada render do servidor; a assinatura
    // resume o conteúdo que importa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinatura, motoboyId]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    []
  );

  if (!aviso) return null;

  const conteudo = (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15">
        <BellRing className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black">{aviso.titulo}</span>
        <span className="mt-0.5 block truncate text-xs font-medium text-white/80">
          {aviso.detalhe}
        </span>
      </span>
    </>
  );

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-50 px-3 pt-3"
    >
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-[#15924A] p-3 text-white shadow-lg ring-1 ring-black/10">
        {aviso.href ? (
          <Link
            href={aviso.href}
            onClick={() => setAviso(null)}
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            {conteudo}
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3">{conteudo}</div>
        )}
        <button
          type="button"
          onClick={() => setAviso(null)}
          aria-label="Fechar aviso"
          className="grid size-8 shrink-0 place-items-center rounded-full text-white/80 hover:bg-white/10"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
