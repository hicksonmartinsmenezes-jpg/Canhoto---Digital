import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { usuariosAdmin } from "@/lib/db/schema";
import { obterUsuarioAdminIdDaSessao } from "@/lib/admin-session";

export interface AdminAutenticado {
  usuarioAdminId: string;
  colaboradorId: string | null;
  email: string;
}

export async function obterAdminAutenticado(): Promise<AdminAutenticado | null> {
  const usuarioAdminId = await obterUsuarioAdminIdDaSessao();
  if (!usuarioAdminId) return null;

  const db = getDb();
  if (!db) return null;

  const [usuario] = await db
    .select({
      id: usuariosAdmin.id,
      colaboradorId: usuariosAdmin.colaboradorId,
      email: usuariosAdmin.email,
    })
    .from(usuariosAdmin)
    .where(
      and(
        eq(usuariosAdmin.id, usuarioAdminId),
        eq(usuariosAdmin.ativo, true)
      )
    )
    .limit(1);

  if (!usuario) return null;

  return {
    usuarioAdminId: usuario.id,
    colaboradorId: usuario.colaboradorId,
    email: usuario.email,
  };
}

export async function exigirAdminAutenticado(): Promise<boolean> {
  return Boolean(await obterAdminAutenticado());
}
