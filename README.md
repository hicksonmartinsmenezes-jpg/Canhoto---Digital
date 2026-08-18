# Canhoto Digital — Rildon Eletropeças

Portal Web Admin para digitalizar e organizar o **Canhoto Interno**: o comprovante de recebimento de documentos entre funcionários e setores da Rildon. Substitui o controle manual em papel, permitindo registrar cada recebimento (funcionário responsável, documento, setor, data e status) e consultar/rastrear os comprovantes depois.

Escopo confirmado (18/08/2026): apenas o fluxo interno de recebimento de documentos. Não inclui entrega a cliente externo (motoboy, transportadora) — esse era o escopo do Termo de Abertura original e foi descartado.

## Estrutura do repositório

```
Canhoto - Digital/
├── frontend/   # Next.js (TypeScript + Tailwind) — Portal Web Admin
└── backend/    # Supabase (Postgres + Auth + Storage) — schema, migrations, functions
```

Cada pasta tem seu próprio README com instruções específicas.

## Stack

- **Frontend**: Next.js (App Router, TypeScript, Tailwind CSS), cliente Supabase via `@supabase/ssr`.
- **Backend**: Supabase (Postgres relacional, Auth, Storage para anexos/fotos/assinaturas, Realtime).
- **Sem servidor Node/Express próprio** — decisão consciente para um time pequeno priorizar velocidade de entrega; se necessário no futuro, dá para adicionar Edge Functions do Supabase sem subir um serviço separado.

## Como começar

1. `cd frontend && npm install`
2. Copie `frontend/.env.local.example` para `frontend/.env.local` e preencha com as chaves do projeto Supabase.
3. `cd backend && npx supabase start` (ambiente local) ou `npx supabase link --project-ref <ID>` (projeto na nuvem) — ver `backend/README.md`.
4. `cd frontend && npm run dev` — abre em `http://localhost:3000`.

## Documentação do projeto

As decisões de produto, modelo de dados, análise de UX/UI de referência e demais registros ficam no projeto Claude "Canhoto Rildon Eletropeças" (fora deste repositório) — consulte-o para contexto antes de propor mudanças de escopo.
