# Frontend — Canhoto Interno

Portal Web Admin em [Next.js](https://nextjs.org) (App Router + TypeScript + Tailwind CSS), consumindo o Supabase definido em `../backend`.

## Como rodar

```bash
npm install
cp .env.local.example .env.local   # preencha com as chaves do seu projeto Supabase
npm run dev
```

Abre em `http://localhost:3000`.

## Estrutura

```
src/
├── app/                        # rotas (App Router)
│   ├── page.tsx                 # Dashboard
│   ├── canhotos/
│   ├── colaboradores/
│   ├── setores/
│   ├── relatorios/
│   └── configuracoes/
│       ├── usuarios/
│       └── tipos-documento/
├── components/layout/           # Sidebar e demais componentes de layout
├── lib/supabase/                # clientes Supabase (browser e server)
└── types/database.ts            # tipos do schema (substituir pelo gerado via `supabase gen types`)
```

Todas as páginas de entidade estão como placeholder ("Página em construção") — o protótipo visual completo do Dashboard já existe (`dashboard-canhoto-interno.html`, enviado por Claude) e ainda precisa ser portado para os componentes React, seguindo os padrões de UX/UI de referência analisados (ver documentação do projeto).
