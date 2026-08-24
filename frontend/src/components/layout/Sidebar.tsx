"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  LayoutDashboard,
  Package,
  Users,
  Bike,
  FileBarChart,
  Menu,
  ClipboardList,
  ChevronDown,
  Car,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Estrutura de navegação do Portal Web Admin — Canhoto Digital.
// Escopo confirmado (schema v2, 18/08/2026): entrega ao cliente externo via
// motoboy — substituiu o fluxo interno funcionário-para-funcionário da v1.
// "Setores" saiu do menu: só a Expedição opera o sistema de entregas de
// fato — não há múltiplos setores para gerenciar aqui.
// "Usuários" também saiu do menu: o sistema terá no mínimo só 2 usuários,
// não justifica uma tela de gestão de acesso dedicada.
// "Tipos de Documento" saiu (schema v2): praticamente toda entrega é do
// mesmo tipo (NF-e de mercadoria), não há o que categorizar.
// "Colaboradores" e "Motoristas" (19/08/2026): agrupados dentro de um
// submenu "Cadastros" (a pedido do Hickson), em vez de dois itens soltos
// no nível principal — os dois são telas de cadastro de referência, faz
// sentido ficarem juntos.
// "Gestão de Veículos" (21/08/2026): nova aba pedida pelo Hickson — por
// enquanto só a entrada no menu + página placeholder (`/veiculos`); o
// controle de gastos por veículo (combustível, multas, lava-jato,
// manutenção etc.) ainda não foi implementado.
const NAV_ITEMS = [
  { type: "link" as const, href: "/", label: "Dashboard", icon: LayoutDashboard },
  { type: "link" as const, href: "/canhotos", label: "Entregas", icon: Package },
  {
    type: "group" as const,
    label: "Cadastros",
    icon: ClipboardList,
    children: [
      { href: "/colaboradores", label: "Colaboradores", icon: Users },
      { href: "/motoboys", label: "Motoristas", icon: Bike },
    ],
  },
  { type: "link" as const, href: "/veiculos", label: "Gestão de Veículos", icon: Car },
  { type: "link" as const, href: "/relatorios", label: "Relatórios", icon: FileBarChart },
];

// Barra lateral com auto-abertura (19/08/2026, v2): agora fica sempre
// visível numa faixa recolhida de 64px (`w-16`) — não mais uma faixa
// invisível de 3px — mostrando a marca em círculo no topo e os ícones do
// menu (sem rótulo) abaixo, no estilo de referência trazido pelo Hickson.
// Passa o mouse por cima e ela abre (animação de largura) até 256px
// (`w-64`), revelando o hambúrguer ao lado do logo completo e os rótulos
// dos itens. Por ser "fixed" na viewport, não se move quando a página tem
// scroll — fica sempre estática no lugar.
// Classe "peer": permite que o <main> (irmão logo abaixo no layout.tsx)
// reaja ao hover daqui com `peer-hover:` — arrastando a página pro lado
// só a DIFERENÇA entre os dois estados (256-64=192px/w-48), já que os 64px
// da faixa recolhida já são reservados de forma fixa (`md:ml-16` no main).
// Classe "group": deixa a marca em círculo (filha, some no hover) e o
// cabeçalho aberto (hambúrguer + logo, aparece no hover) fazerem crossfade
// via `group-hover:`, já que `peer-hover:` só funciona entre irmãos.
export function Sidebar() {
  const pathname = usePathname();
  const cadastrosItem = NAV_ITEMS.find((item) => item.type === "group")!;
  const cadastrosAtivo = cadastrosItem.children.some((child) =>
    pathname.startsWith(child.href)
  );
  // Começa aberto se a rota atual já é uma das telas de Cadastros — assim
  // o usuário vê de cara onde está, em vez de precisar clicar pra revelar.
  const [cadastrosAberto, setCadastrosAberto] = useState(cadastrosAtivo);
  const [saindo, setSaindo] = useState(false);
  const router = useRouter();

  // App do motorista (Issue #5) tem navegação própria, mobile-first — não
  // faz parte do Portal Admin que esta barra representa. Fica depois dos
  // hooks acima (nunca antes) pra não variar a ordem de chamada entre
  // renders — o Sidebar é montado uma vez só no layout raiz e persiste
  // entre navegações client-side, então um `return` condicional antes de
  // um hook quebraria as Rules of Hooks ao navegar entre /motorista e o
  // resto do site.
  if (pathname.startsWith("/motorista") || pathname === "/login") return null;

  // Sai da conta do admin (Issue #48) — encerra a sessão do Supabase Auth
  // no navegador (mesma sessão que o middleware valida a cada request) e
  // manda pra tela de login.
  async function sair() {
    setSaindo(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div
      data-testid="sidebar"
      className="peer group fixed inset-y-0 left-0 z-40 hidden w-16 overflow-hidden transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:w-64 md:block"
    >
      <aside className="flex h-full w-64 flex-col bg-[#0A1F44] text-white/70">
        <div className="relative flex h-[68px] shrink-0 items-center px-4">
          {/* Marca recolhida: círculo branco com a logo (mesma imagem do
              favicon, 19/08/2026) — visível só com a barra fechada,
              centralizada nos 64px visíveis. */}
          <div className="absolute inset-0 flex w-16 items-center justify-center transition-opacity duration-200 group-hover:opacity-0">
            <div className="grid size-9 place-items-center rounded-full bg-white p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/rildon-mark.png"
                alt="Rildon Express"
                className="size-full object-contain"
              />
            </div>
          </div>

          {/* Cabeçalho aberto: hambúrguer ao lado do logo completo —
              invisível com a barra fechada, aparece com um pequeno atraso
              conforme ela termina de abrir. Logo com "max-w" (além do
              "h-7") pra nunca ultrapassar a largura dos 256px da barra —
              antes vazava ~16px pra fora e cortava o "S" de "EXPRESS". */}
          <div className="flex min-w-0 items-center gap-4 opacity-0 transition-opacity delay-150 duration-300 group-hover:opacity-100">
            <Menu className="size-5 shrink-0 text-white" strokeWidth={2.25} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/rildon-express-logo-white.svg"
              alt="Rildon Express"
              className="h-7 w-auto max-w-[172px] shrink-0"
            />
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-2">
          {NAV_ITEMS.map((item) => {
            if (item.type === "link") {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 border-l-2 px-1 py-2 text-[15px] transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.98] ${
                    isActive
                      ? "border-transparent font-semibold text-white group-hover:border-[#FFD200] group-hover:bg-white/10"
                      : "border-transparent text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {/* Com a barra fechada, só o ícone acende (fundo redondo
                      clarinho atrás dele); com a barra aberta, esse fundo some
                      (`group-hover:bg-transparent`) e quem acende é a linha
                      inteira, via as classes `group-hover:` acima no <Link>.
                      "group-hover:" (não "peer-hover:") porque o <Link> é
                      DESCENDENTE do wrapper com overflow-hidden, não irmão —
                      `peer-hover:` só funciona entre irmãos diretos. */}
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-lg transition-colors ${
                      isActive ? "bg-white/10 group-hover:bg-transparent" : ""
                    }`}
                  >
                    <Icon className="size-5 shrink-0" strokeWidth={2} />
                  </span>
                  <span className="whitespace-nowrap opacity-0 transition-opacity delay-150 duration-300 group-hover:opacity-100">
                    {item.label}
                  </span>
                </Link>
              );
            }

            // Grupo "Cadastros": um botão que expande/recolhe os itens
            // filhos abaixo dele, em vez de navegar direto.
            const GroupIcon = item.icon;
            const grupoAtivo = item.children.some((child) =>
              pathname.startsWith(child.href)
            );
            return (
              <div key={item.label}>
                <button
                  type="button"
                  onClick={() => setCadastrosAberto((v) => !v)}
                  className={`flex w-full items-center gap-3 border-l-2 px-1 py-2 text-[15px] transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.98] ${
                    grupoAtivo
                      ? "border-transparent font-semibold text-white group-hover:border-[#FFD200] group-hover:bg-white/10"
                      : "border-transparent text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span
                    className={`grid size-9 shrink-0 place-items-center rounded-lg transition-colors ${
                      grupoAtivo ? "bg-white/10 group-hover:bg-transparent" : ""
                    }`}
                  >
                    <GroupIcon className="size-5 shrink-0" strokeWidth={2} />
                  </span>
                  <span className="flex min-w-0 flex-1 items-center justify-between whitespace-nowrap opacity-0 transition-opacity delay-150 duration-300 group-hover:opacity-100">
                    {item.label}
                    <ChevronDown
                      className={`size-4 shrink-0 transition-transform ${
                        cadastrosAberto ? "rotate-180" : ""
                      }`}
                      strokeWidth={2}
                    />
                  </span>
                </button>

                {/* Expandir/recolher com altura animada (motion mede o
                    "auto" real do conteúdo) em vez do corte instantâneo de
                    antes — mesma duração/curva "spring sem bounce" usada
                    nos outros elementos utilitários da interface. */}
                <AnimatePresence initial={false}>
                  {cadastrosAberto && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ type: "spring", duration: 0.35, bounce: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-1 space-y-1">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon;
                          const isActive = pathname.startsWith(child.href);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={`flex items-center gap-3 border-l-2 py-2 pr-1 pl-5 text-[15px] transition-[color,background-color,border-color,transform] duration-150 active:scale-[0.98] ${
                                isActive
                                  ? "border-transparent font-semibold text-white group-hover:border-[#FFD200] group-hover:bg-white/10"
                                  : "border-transparent text-white/80 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              <span
                                className={`grid size-7 shrink-0 place-items-center rounded-lg transition-colors ${
                                  isActive ? "bg-white/10 group-hover:bg-transparent" : ""
                                }`}
                              >
                                <ChildIcon className="size-4 shrink-0" strokeWidth={2} />
                              </span>
                              <span className="whitespace-nowrap opacity-0 transition-opacity delay-150 duration-300 group-hover:opacity-100">
                                {child.label}
                              </span>
                            </Link>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        {/* Botão de sair (Issue #48) — mesmo padrão visual dos itens do
            menu acima (ícone fixo + rótulo que aparece com a barra aberta),
            fixado no fim da coluna porque "nav" tem flex-1. */}
        <div className="border-t border-white/10 px-2 py-2">
          <button
            type="button"
            onClick={sair}
            disabled={saindo}
            className="flex w-full items-center gap-3 border-l-2 border-transparent px-1 py-2 text-[15px] text-white/80 transition-colors duration-150 hover:bg-white/10 hover:text-white disabled:opacity-60"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg">
              <LogOut className="size-5 shrink-0" strokeWidth={2} />
            </span>
            <span className="whitespace-nowrap opacity-0 transition-opacity delay-150 duration-300 group-hover:opacity-100">
              {saindo ? "Saindo..." : "Sair"}
            </span>
          </button>
        </div>
      </aside>
    </div>
  );
}
