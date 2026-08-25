// Rótulos de PapelColaborador — arquivo separado (sem nenhuma dependência
// de servidor/Supabase) de propósito: @/lib/data/colaboradores importa
// "server-only" (via @/lib/supabase/admin), então um Client Component
// (ColaboradoresManager) não pode importar nada dali, nem um valor simples
// como esse — o bundler falha com "You're importing a module that depends
// on server-only... in the Pages Router" mesmo em Client Component do App
// Router, porque o import puxa o módulo inteiro.

import type { PapelColaborador } from "@/types/database";

export const PAPEL_LABEL: Record<PapelColaborador, string> = {
  admin: "Admin",
  gestor_setor: "Gestor de setor",
  colaborador: "Colaborador",
};
