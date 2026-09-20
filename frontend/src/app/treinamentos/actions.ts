"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obterAdminAutenticado } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";
import { treinamentoProgresso } from "@/lib/db/schema";
import { checarRateLimit } from "@/lib/rate-limit";
import { obterTreinamentoPorSlug } from "@/lib/treinamentos";

function validarTreinamento(slug: string): boolean {
  return Boolean(obterTreinamentoPorSlug(slug));
}

export async function iniciarTreinamento(slug: string): Promise<void> {
  if (!validarTreinamento(slug)) {
    redirect("/treinamentos");
  }

  const admin = await obterAdminAutenticado();
  if (!admin) {
    redirect("/login");
  }

  const limite = await checarRateLimit("iniciarTreinamento");
  if (!limite.permitido) {
    redirect(`/treinamentos/${slug}`);
  }

  const db = getDb();
  if (!db) {
    redirect(`/treinamentos/${slug}`);
  }

  const agora = new Date().toISOString();

  await db
    .insert(treinamentoProgresso)
    .values({
      usuarioAdminId: admin.usuarioAdminId,
      treinamentoSlug: slug,
      status: "em_andamento",
      iniciadoEm: agora,
      concluidoEm: null,
      atualizadoEm: agora,
    })
    .onConflictDoNothing({
      target: [
        treinamentoProgresso.usuarioAdminId,
        treinamentoProgresso.treinamentoSlug,
      ],
    });

  revalidatePath("/treinamentos");
  revalidatePath(`/treinamentos/${slug}`);
  redirect(`/treinamentos/${slug}`);
}

export async function concluirTreinamento(slug: string): Promise<void> {
  if (!validarTreinamento(slug)) {
    redirect("/treinamentos");
  }

  const admin = await obterAdminAutenticado();
  if (!admin) {
    redirect("/login");
  }

  const limite = await checarRateLimit("concluirTreinamento");
  if (!limite.permitido) return;

  const db = getDb();
  if (!db) return;

  const agora = new Date().toISOString();

  const [existente] = await db
    .select({ id: treinamentoProgresso.id })
    .from(treinamentoProgresso)
    .where(
      and(
        eq(treinamentoProgresso.usuarioAdminId, admin.usuarioAdminId),
        eq(treinamentoProgresso.treinamentoSlug, slug)
      )
    )
    .limit(1);

  if (existente) {
    await db
      .update(treinamentoProgresso)
      .set({
        status: "concluido",
        concluidoEm: agora,
        atualizadoEm: agora,
      })
      .where(eq(treinamentoProgresso.id, existente.id));
  } else {
    await db.insert(treinamentoProgresso).values({
      usuarioAdminId: admin.usuarioAdminId,
      treinamentoSlug: slug,
      status: "concluido",
      iniciadoEm: agora,
      concluidoEm: agora,
      atualizadoEm: agora,
    });
  }

  revalidatePath("/treinamentos");
  revalidatePath(`/treinamentos/${slug}`);
}
