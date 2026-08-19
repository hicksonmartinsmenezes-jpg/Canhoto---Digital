// Dados de exemplo para o mapa em tempo real de motoboys no Dashboard.
// Coordenadas fictícias, plotadas ao redor de Aracaju/SE (sede da Rildon
// Eletropeças — Av. Chanceler Osvaldo Aranha, 122 A) só pra ilustrar o
// layout no mapa.
//
// IMPORTANTE: isso ainda não é rastreamento real. Hoje não existe nenhuma
// fonte de posição vinda do motoboy (ele não tem app/login no sistema).
// Quando o app do motoboy existir (ver claude/ideias-decisoes-projeto.md,
// seção "Ideia: app do motoboy + mapeamento"), essas posições passam a vir
// de verdade — por checkpoint (saída/entrega) na primeira versão, e só
// depois, se fizer sentido, em rastreamento contínuo.

export interface MotoboyLocalizacao {
  id: string;
  motoboy: string;
  lat: number;
  lng: number;
  entregaNumero: string;
  cliente: string;
  atualizadoEm: string;
}

export const MOTOBOYS_LOCALIZACAO: MotoboyLocalizacao[] = [
  {
    id: "1",
    motoboy: "Gonçalves",
    lat: -10.9472,
    lng: -37.0731,
    entregaNumero: "#1249",
    cliente: "Rowlson",
    atualizadoEm: "há 2 min",
  },
  {
    id: "2",
    motoboy: "Da Paz",
    lat: -10.9291,
    lng: -37.0645,
    entregaNumero: "#1252",
    cliente: "Automotic Peças",
    atualizadoEm: "há 1 min",
  },
  {
    id: "3",
    motoboy: "Kaique",
    lat: -10.9613,
    lng: -37.0512,
    entregaNumero: "#1253",
    cliente: "TD Tech — Filial 2",
    atualizadoEm: "agora",
  },
];
