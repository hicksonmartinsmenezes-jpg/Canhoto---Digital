import { HTMLAttributes } from "react";

// `h-full`: quando dois Cards dividem a mesma linha do grid do Dashboard
// (ex. "Entregas recentes" + "Motoristas em tempo real"), o CSS Grid já
// estica a célula (div wrapper) do mais curto até a altura da linha por
// padrão — mas sem `h-full` aqui, o próprio Card ficava do tamanho do seu
// conteúdo, sobrando espaço vazio ABAIXO da borda dele. Com `h-full`, o
// Card preenche a célula inteira e as bordas de baixo dos dois cards da
// linha ficam alinhadas (Hickson pediu, 21/08/2026). Fora de um contexto
// grid/flex com altura definida, `h-full` não tem efeito (resolve pra
// `auto`), então é seguro nos outros usos do Card pelo site.
export function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`h-full border border-slate-200 bg-white shadow-sm ${className}`}
      {...props}
    />
  );
}
