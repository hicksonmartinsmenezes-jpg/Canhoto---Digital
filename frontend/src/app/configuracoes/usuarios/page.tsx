export default function UsuariosPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
      <p className="mt-1 text-sm text-slate-500">
        Quem tem acesso ao portal.
      </p>
      <div className="mt-8 space-y-3 border border-slate-200 bg-white p-6 text-sm text-slate-500">
        <p>Não existe uma tela única de permissões — cada tipo de acesso funciona diferente:</p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <span className="font-semibold text-slate-700">Admin</span> —
            acesso completo ao Portal. Só criado por terminal:{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5">
              .\scripts\criar-admin.ps1
            </code>
            .
          </li>
          <li>
            <span className="font-semibold text-slate-700">
              Gestor de setor
            </span>{" "}
            — acesso quase igual ao Admin, mas só enxerga o setor dele.
            Cadastre/edite em{" "}
            <span className="font-semibold text-slate-700">
              Colaboradores
            </span>
            , escolha o papel &quot;Gestor de setor&quot; e defina a senha
            direto no formulário.
          </li>
          <li>
            <span className="font-semibold text-slate-700">Motorista</span>{" "}
            — gerado em Motoboys, botão &quot;Gerar PIN&quot; (acesso só ao{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5">
              /motorista
            </code>
            ).
          </li>
        </ul>
      </div>
    </div>
  );
}
