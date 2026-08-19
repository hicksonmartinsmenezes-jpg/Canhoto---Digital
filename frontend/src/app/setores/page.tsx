export default function SetoresPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Setores</h1>
      <p className="mt-1 text-sm text-slate-500">
        O controle e arquivamento dos canhotos é feito por um único setor: a
        Expedição.
      </p>
      <div className="mt-8 border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Decidimos não ter uma tela de gestão de múltiplos setores — só a
        Expedição efetivamente opera o sistema de canhotos, então esse
        conceito ficou fixo em vez de virar um cadastro. Os demais
        departamentos da empresa (Financeiro, RH etc.) podem aparecer como
        setor de origem de um colaborador, mas não administram canhotos aqui.
      </div>
    </div>
  );
}
