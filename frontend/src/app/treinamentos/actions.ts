"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obterAdminAutenticado } from "@/lib/admin-auth";
import { checarRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { obterTreinamentoPorSlug } from "@/lib/treinamentos";

function validarTreinamento(slug: string): boolean {
  return Boolean(obterTreinamentoPorSlug(slug));
}

export async function iniciarTreinamento(slug: string): Promise<void> {
  if (!validarTreinamento(slug)) redirect("/treinamentos");

  const admin = await obterAdminAutenticado();
  if (!admin) redirect("/login");

  const limite = await checarRateLimit("iniciarTreinamento");
  if (!limite.permitido) redirect(`/treinamentos/${slug}`);

  const supabase = await createClient();
  const { data: existente } = await supabase
    .from("treinamento_progresso")
    .select("status")
    .eq("usuario_id", admin.authUserId)
    .eq("treinamento_slug", slug)
    .maybeSingle();

  if (!existente) {
    const agora = new Date().toISOString();
    await supabase.from("treinamento_progresso").insert({
      usuario_id: admin.authUserId,
      treinamento_slug: slug,
      status: "em_andamento",
      iniciado_em: agora,
      concluido_em: null,
      atualizado_em: agora,
    });
  }

  revalidatePath("/treinamentos");
  revalidatePath(`/treinamentos/${slug}`);
  redirect(`/treinamentos/${slug}`);
}

export async function concluirTreinamento(slug: string): Promise<void> {
  if (!validarTreinamento(slug)) redirect("/treinamentos");

  const admin = await obterAdminAutenticado();
  if (!admin) redirect("/login");

  const limite = await checarRateLimit("concluirTreinamento");
  if (!limite.permitido) return;

  const agora = new Date().toISOString();
  const supabase = await createClient();

  const { data: existente } = await supabase
    .from("treinamento_progresso")
    .select("id")
    .eq("usuario_id", admin.authUserId)
    .eq("treinamento_slug", slug)
    .maybeSingle();

  if (existente) {
    await supabase
      .from("treinamento_progresso")
      .update({
        status: "concluido",
        concluido_em: agora,
        atualizado_em: agora,
      })
      .eq("id", existente.id)
      .eq("usuario_id", admin.authUserId);
  } else {
    await supabase.from("treinamento_progresso").insert({
      usuario_id: admin.authUserId,
      treinamento_slug: slug,
      status: "concluido",
      iniciado_em: agora,
      concluido_em: agora,
      atualizado_em: agora,
    });
  }

  revalidatePath("/treinamentos");
  revalidatePath(`/treinamentos/${slug}`);
}
