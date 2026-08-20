import { SkeletonPageHeader, SkeletonPanel, SkeletonStatCards } from "@/components/ui/Skeleton";

// Skeleton screen do Dashboard — a página busca stats, entregas recentes,
// alertas e atividade no Supabase (`export const dynamic = "force-dynamic"`
// em app/page.tsx), então sem isso a tela ficava em branco até tudo
// resolver. Reproduz a mesma grade de 12 colunas da página real, só com
// blocos cinza no lugar do conteúdo — assim não há "pulo" de layout
// quando os dados chegam.
export default function DashboardLoading() {
  return (
    <div>
      <SkeletonPageHeader />

      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-12">
          <SkeletonStatCards />
        </div>

        <div className="col-span-12 xl:col-span-8">
          <SkeletonPanel lines={5} />
        </div>

        <div className="col-span-12 xl:col-span-4">
          <SkeletonPanel lines={3} />
        </div>

        <div className="col-span-12 xl:col-span-6">
          <SkeletonPanel lines={4} />
        </div>

        <div className="col-span-12 xl:col-span-6">
          <SkeletonPanel lines={4} />
        </div>
      </div>
    </div>
  );
}
