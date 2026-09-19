import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { formatBRL } from "@/lib/format";
import { obterMotoristaAutorizado } from "@/lib/motorista-authorization";
import type { FormaPagamento, StatusEntrega } from "@/types/database";

export interface EntregaMotorista {
  id: string;
  numero: string;
  clienteNome: string;
  endereco: string;
  valor: string;
  formaPagamento: FormaPagamento;
  status: StatusEntrega;
  horaSaida: string | null;
  clienteAssinouEm: string | null;
}

/**
 * Lista somente as entregas do motorista autenticado.
 * A identidade nunca vem do caller: é resolvida pela sessão assinada
 * e revalidada contra o cadastro ativo de motoristas.
 */
export async function getEntregasDoMotoristaAtual(): Promise<EntregaMotorista[]> {
  const motoboyId = await obterMotoristaAutorizado();
  if (!motoboyId) return [];

  const supabase = createAdminClient();
  if (!supabase) return [];

  const hoje = new Date();
  const chaveDia = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("entregas")
    .select(
      "id, numero, cliente_nome, endereco, valor_pagamento, forma_pagamento, status, hora_saida, cliente_assinou_em"
    )
    .eq("motoboy_id", motoboyId)
    .eq("data", chaveDia)
    .neq("status", "cancelado")
    .order("numero", { ascending: true });

  if (error || !data) return [];

  return data.map((e) => ({
    id: e.id,
    numero: `#${e.numero}`,
    clienteNome: e.cliente_nome,
    endereco: e.endereco ?? "",
    valor: formatBRL(Number(e.valor_pagamento)),
    formaPagamento: e.forma_pagamento,
    status: e.status,
    horaSaida: e.hora_saida,
    clienteAssinouEm: e.cliente_assinou_em,
  }));
}
