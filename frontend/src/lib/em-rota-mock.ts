// Dados de exemplo para o card "Motoboys em rota" do Dashboard — quem já
// saiu para entrega (campo `hora_saida` preenchido) mas ainda não teve a
// entrega confirmada pelo cliente (`cliente_assinou_em` nulo).
//
// Isso é um recorte simples que já dá pra fazer com o modelo atual, sem
// depender de rastreamento por GPS — ver "Ideia: app do motoboy +
// mapeamento" em claude/ideias-decisoes-projeto.md para o passo seguinte
// (quando o motoboy tiver um app próprio, dá pra evoluir isso para um mapa
// de verdade, por checkpoint de localização).
//
// Substituir por consulta real ao Supabase quando o projeto estiver
// conectado (status = 'pendente' AND hora_saida IS NOT NULL).

export interface MotoboyEmRota {
  id: string;
  motoboy: string;
  entregaNumero: string;
  cliente: string;
  horaSaida: string;
  tempoEmRota: string;
}

export const MOTOBOYS_EM_ROTA: MotoboyEmRota[] = [
  {
    id: "1",
    motoboy: "Gonçalves",
    entregaNumero: "#1249",
    cliente: "Rowlson",
    horaSaida: "09:25",
    tempoEmRota: "há 42 min",
  },
  {
    id: "2",
    motoboy: "Da Paz",
    entregaNumero: "#1252",
    cliente: "Automotic Peças",
    horaSaida: "10:05",
    tempoEmRota: "há 12 min",
  },
  {
    id: "3",
    motoboy: "Kaique",
    entregaNumero: "#1253",
    cliente: "TD Tech — Filial 2",
    horaSaida: "10:10",
    tempoEmRota: "há 7 min",
  },
];
