export default function UsuariosPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
      <p className="mt-1 text-sm text-slate-500">
        Quem tem acesso ao portal.
      </p>
      <div className="mt-8 border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Decidimos não ter uma tela de gestão de usuários — o sistema vai ter
        no mínimo só 2 usuários, o que não justifica uma tela dedicada de
        cadastro/permissões. O acesso desses usuários pode ser configurado
        direto no Supabase Auth quando o projeto for conectado.
      </div>
    </div>
  );
}
