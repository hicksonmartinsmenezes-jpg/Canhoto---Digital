"use server";

// Logout único pro Sidebar, sem precisar saber ali se quem está logado é
// Admin ou colaborador (gestor_setor) — limpa os dois cookies possíveis e
// manda pra tela de login (a mesma pros dois: Usuário e Senha).

import { redirect } from "next/navigation";
import { encerrarSessaoAdmin } from "@/lib/admin-session";
import { encerrarSessaoColaborador } from "@/lib/colaborador-session";

export async function sairOperador(): Promise<void> {
  await encerrarSessaoAdmin();
  await encerrarSessaoColaborador();
  redirect("/login");
}
