export default function UsuariosPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Quem tem acesso ao portal e com qual papel (admin, gestor de setor,
        colaborador).
      </p>
      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
        Página em construção — gestão de acesso (tabela `colaboradores`,
        campo `papel`, vinculado ao Supabase Auth).
      </div>
    </div>
  );
}
