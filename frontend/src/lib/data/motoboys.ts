// Camada de acesso a dados reais de Motoboys (Supabase) — hoje usada só para
// alimentar a sugestão de motoboy no wizard "Adicionar Entrega" e a tela de
// Motoristas. Ver claude/modelo-de-dados-site.md para o schema.

import { createAdminClient } from "@/lib/supabase/admin";

export interface MotoboyOption {
  id: string;
  nome: string;
}

export async function getMotoboys(): Promise<MotoboyOption[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("motoboys")
    .select("id, nome")
    .eq("ativo", true)
    .order("nome");

  if (error || !data) return [];
  return data;
}

export interface MotoboyListItem {
  id: string;
  nome: string;
  ativo: boolean;
  entregasNoMes: number;
  // Telefone é o "usuário" do login do app do motorista (Issue #5) —
  // `temPin` só indica se um PIN já foi gerado, nunca expõe o hash pro
  // client component.
  telefone: string | null;
  temPin: boolean;
}

// Lista completa (ativos e inativos) para a tela de Motoristas, com a
// contagem de entregas no mês corrente — usada só como contexto na listagem,
// não é uma métrica de performance oficial ainda.
export async function getMotoboysList(): Promise<MotoboyListItem[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];

  const inicioMes = new Date();
  inicioMes.setDate(1);
  const inicioMesStr = inicioMes.toISOString().slice(0, 10);

  const [motoboysRes, entregasRes] = await Promise.all([
    supabase
      .from("motoboys")
      .select("id, nome, ativo, telefone, pin_hash")
      .order("nome"),
    supabase
      .from("entregas")
      .select("motoboy_id")
      .gte("data", inicioMesStr)
      .not("motoboy_id", "is", null),
  ]);

  if (motoboysRes.error || !motoboysRes.data) return [];

  const contagem = new Map<string, number>();
  for (const e of entregasRes.data ?? []) {
    if (!e.motoboy_id) continue;
    contagem.set(e.motoboy_id, (contagem.get(e.motoboy_id) ?? 0) + 1);
  }

  return motoboysRes.data.map((m) => ({
    id: m.id,
    nome: m.nome,
    ativo: m.ativo,
    entregasNoMes: contagem.get(m.id) ?? 0,
    telefone: m.telefone,
    temPin: m.pin_hash !== null,
  }));
}

export interface MotoboyAuth {
  id: string;
  pinHash: string | null;
  ativo: boolean;
}

// Usado só pelo login do app do motorista (@/app/motorista/login/actions) —
// devolve o hash do PIN, então nunca deve ser exposto a um Client Component.
// `telefone` já deve chegar normalizado (só dígitos, ver
// @/lib/motorista-auth normalizarTelefone) — a coluna não tem máscara.
export async function getMotoboyPorTelefone(
  telefone: string
): Promise<MotoboyAuth | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("motoboys")
    .select("id, pin_hash, ativo")
    .eq("telefone", telefone)
    .maybeSingle();

  if (error || !data) return null;
  return { id: data.id, pinHash: data.pin_hash, ativo: data.ativo };
}

// Usado pela tela logada do app do motorista (@/app/motorista) só pra
// mostrar o nome de quem entrou — a identidade em si vem do cookie de
// sessão (@/lib/motorista-session), isso aqui é só o "quem é" pra exibir.
export async function getMotoboyNome(id: string): Promise<string | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("motoboys")
    .select("nome")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data.nome;
}
