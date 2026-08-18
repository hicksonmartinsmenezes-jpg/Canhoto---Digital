export default function CanhotosPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Canhotos</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Registro de recebimento de documentos: quem recebeu, o documento, o
        setor responsável, data e status (pendente, recebido, devolvido,
        cancelado).
      </p>
      <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">
        Página em construção — lista + cadastro de canhotos (tabela
        `canhotos` no Supabase).
      </div>
    </div>
  );
}
