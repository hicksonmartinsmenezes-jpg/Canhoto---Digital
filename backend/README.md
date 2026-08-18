# Backend — Canhoto Interno

Backend baseado em [Supabase](https://supabase.com) (Postgres + Auth + Storage + Realtime). Não há servidor Node/Express próprio — o frontend fala direto com o Supabase, e as regras de negócio ficam em migrations SQL, funções/triggers do Postgres e, quando necessário, nas rotas de API do Next.js (dentro de `frontend/`).

## Estrutura

```
backend/
└── supabase/
    ├── config.toml       # configuração do projeto Supabase (gerado por `supabase init`)
    ├── migrations/        # histórico de mudanças no schema (SQL versionado)
    └── functions/         # Edge Functions (Deno), se/quando precisarmos de lógica server-side extra
```

## Como usar

1. Instale a CLI do Supabase (se ainda não tiver): `npm install -g supabase` (ou use `npx supabase ...` sem instalar globalmente).
2. Para desenvolver localmente com Docker: `npx supabase start` (sobe Postgres + Auth + Storage localmente).
3. Aplique as migrations: `npx supabase db reset` (ambiente local) recria o banco do zero a partir de `migrations/`.
4. Para conectar a um projeto Supabase real (na nuvem): `npx supabase link --project-ref <ID_DO_PROJETO>` e depois `npx supabase db push` para aplicar as migrations.
5. Gere os tipos TypeScript para o frontend depois de qualquer mudança de schema:
   ```
   npx supabase gen types typescript --linked > ../frontend/src/types/database.ts
   ```
   (ou `--local` se estiver usando `supabase start`)

## Schema atual

Ver `supabase/migrations/20260818000000_init_schema.sql` — implementa o modelo de dados definido no projeto (`setores`, `colaboradores`, `tipos_documento`, `canhotos`, `canhoto_anexos`, `canhoto_historico`), incluindo o fluxo de duas etapas (assinatura do funcionário → arquivamento pelo setor responsável) e uma trigger que registra automaticamente o histórico de status.

**Pendências conhecidas** (ver documentação do projeto para decisões em aberto):
- Regra do `prazo_arquivamento` (fixo por política vs. definido manualmente por canhoto).
- Políticas de escrita (insert/update/delete) por papel do colaborador — hoje só há política de leitura para usuários autenticados.
