"use client";

import {
  useCallback,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
} from "react";
import {
  MotoristaBottomNav,
  type MotoristaView,
} from "@/components/motorista/MotoristaBottomNav";

const ORDEM: MotoristaView[] = ["entregas", "historico", "perfil"];

// Deslizar mais que isso (px) e mais na horizontal que na vertical troca de aba.
const DISTANCIA_MINIMA_PX = 70;
const PROPORCAO_HORIZONTAL = 1.5;

const ANIMACAO_CSS = `
@keyframes motorista-aba-da-direita {
  from { opacity: 0; transform: translateX(28px); }
  to { opacity: 1; transform: none; }
}
@keyframes motorista-aba-da-esquerda {
  from { opacity: 0; transform: translateX(-28px); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  [data-motorista-aba] { animation: none !important; }
}
`;

interface Props {
  /** Aba aberta na primeira renderização (vem do ?view= da URL). */
  inicial: MotoristaView;
  pendentes: number;
  /** Cabeçalhos (renderizados no servidor) de cada aba que tem um. */
  cabecalhos: Partial<Record<MotoristaView, ReactNode>>;
  /** Conteúdo (renderizado no servidor) de cada aba. */
  conteudos: Record<MotoristaView, ReactNode>;
}

/**
 * As três abas do motorista ficam montadas ao mesmo tempo e só alternam a
 * visibilidade no aparelho: trocar de aba não faz mais uma ida ao servidor
 * (pelo túnel isso levava 1–2 s). Também dá pra deslizar o dedo para os
 * lados. Os dados continuam sendo atualizados pelo MotoristaAutoRefresh.
 */
export function MotoristaTabs({
  inicial,
  pendentes,
  cabecalhos,
  conteudos,
}: Props) {
  const [ativa, setAtiva] = useState<MotoristaView>(inicial);
  const [direcao, setDirecao] = useState<1 | -1 | 0>(0);
  const ativaRef = useRef<MotoristaView>(inicial);
  const toqueInicialRef = useRef<{ x: number; y: number } | null>(null);

  const irPara = useCallback((destino: MotoristaView) => {
    const atual = ativaRef.current;
    if (destino === atual) return;

    setDirecao(ORDEM.indexOf(destino) > ORDEM.indexOf(atual) ? 1 : -1);
    ativaRef.current = destino;
    setAtiva(destino);
    window.scrollTo({ top: 0 });

    // Mantém a URL coerente (?view=) sem navegar nem buscar nada no servidor.
    try {
      const url = new URL(window.location.href);
      if (destino === "entregas") url.searchParams.delete("view");
      else url.searchParams.set("view", destino);
      window.history.replaceState(window.history.state, "", url);
    } catch {
      // Só a URL deixa de refletir a aba; a troca em si já aconteceu.
    }
  }, []);

  function aoTocar(evento: TouchEvent<HTMLDivElement>) {
    toqueInicialRef.current = null;
    if (evento.touches.length !== 1) return;

    // Campos de texto e áreas com rolagem horizontal própria não trocam de aba.
    const alvo = evento.target as HTMLElement;
    if (alvo.closest("[data-no-swipe], input, textarea, select, canvas")) {
      return;
    }

    const toque = evento.touches[0];
    toqueInicialRef.current = { x: toque.clientX, y: toque.clientY };
  }

  function aoSoltar(evento: TouchEvent<HTMLDivElement>) {
    const inicio = toqueInicialRef.current;
    toqueInicialRef.current = null;
    if (!inicio) return;

    const toque = evento.changedTouches[0];
    const dx = toque.clientX - inicio.x;
    const dy = toque.clientY - inicio.y;

    if (Math.abs(dx) < DISTANCIA_MINIMA_PX) return;
    if (Math.abs(dx) < Math.abs(dy) * PROPORCAO_HORIZONTAL) return;

    const indice = ORDEM.indexOf(ativaRef.current);
    const proxima = dx < 0 ? ORDEM[indice + 1] : ORDEM[indice - 1];
    if (proxima) irPara(proxima);
  }

  return (
    <>
      <style>{ANIMACAO_CSS}</style>

      <div
        className="min-h-screen overflow-x-clip"
        style={{ touchAction: "pan-y" }}
        onTouchStart={aoTocar}
        onTouchEnd={aoSoltar}
        onTouchCancel={() => {
          toqueInicialRef.current = null;
        }}
      >
        {ORDEM.map((id) => {
          const visivel = ativa === id;

          return (
            <div
              key={id}
              hidden={!visivel}
              data-motorista-aba={id}
              style={
                visivel && direcao !== 0
                  ? {
                      animation: `${
                        direcao > 0
                          ? "motorista-aba-da-direita"
                          : "motorista-aba-da-esquerda"
                      } 180ms ease-out`,
                    }
                  : undefined
              }
            >
              {cabecalhos[id]}
              <main className="w-full pb-28">{conteudos[id]}</main>
            </div>
          );
        })}
      </div>

      <MotoristaBottomNav
        ativo={ativa}
        pendentes={pendentes}
        onSelecionar={irPara}
      />
    </>
  );
}
