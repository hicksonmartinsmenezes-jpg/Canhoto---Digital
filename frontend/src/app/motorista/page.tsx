import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { obterMotoboyIdDaSessao } from "@/lib/motorista-session";
import { getMotoboyNome } from "@/lib/data/motoboys";
import { getEntregasDoMotorista } from "@/lib/data/entregas";
import { ListaEntregasMotorista } from "@/components/motorista/ListaEntregasMotorista";
import { sairMotorista } from "./actions";

export default async function MotoristaPage() {
  const motoboyId = await obterMotoboyIdDaSessao();
  if (!motoboyId) redirect("/motorista/login");

  const [nome, entregas] = await Promise.all([
    getMotoboyNome(motoboyId).then((n) => n ?? "Motorista"),
    getEntregasDoMotorista(motoboyId),
  ]);

  return (
    <main className="min-h-screen bg-[#03070f] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col border-x border-[#1c355e] bg-[#080f1d] shadow-2xl">
        <header className="border-b border-[#1c355e] bg-[#0e1e38] px-4 pb-4 pt-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.12em] text-white">
                Rildon <span className="italic text-amber-400">Express</span>
              </p>
              <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Motorista
              </p>
              <h1 className="mt-0.5 text-lg font-extrabold text-white">{nome}</h1>
            </div>

            <form action={sairMotorista}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#1c355e] bg-[#162b4d] px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-[#1e3966]"
              >
                <LogOut className="size-4" />
                Sair
              </button>
            </form>
          </div>
        </header>

        <ListaEntregasMotorista entregas={entregas} />
      </div>
    </main>
  );
}
