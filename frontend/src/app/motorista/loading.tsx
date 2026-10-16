// Aparece na hora ao entrar no app do motorista ou voltar à lista, enquanto
// o servidor monta a tela (pelo túnel isso leva um tempo). Sem este arquivo
// o app herdava o esqueleto do Dashboard do Portal, que não tem nada a ver
// com a tela do motorista.
export default function CarregandoMotorista() {
  return (
    <div className="min-h-screen bg-[#F5F7FB]" aria-busy="true">
      <header className="bg-[#082B57] px-4 py-5 text-white">
        <p className="text-[15px] font-black">Carregando…</p>
      </header>

      <main className="w-full space-y-3 px-4 py-4">
        <div className="h-28 animate-pulse rounded-2xl bg-white" />
        <div className="h-24 animate-pulse rounded-2xl bg-white" />
        <div className="h-24 animate-pulse rounded-2xl bg-white" />
      </main>
    </div>
  );
}
