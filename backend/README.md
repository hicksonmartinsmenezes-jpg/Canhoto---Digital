# Backend — Canhoto Digital

A aplicação usa PostgreSQL 16 local, acessado pelo Next.js através do Drizzle ORM.

Não existe backend Supabase nem serviço Node/Express separado. A camada de servidor vive no próprio Next.js por meio de Server Components, Server Actions e Route Handlers.

## Estrutura

```text
backend/
└── postgres/
    ├── README.md
    └── migrations/
        ├── 0001_baseline.sql
        ├── 0002_...
        └── ...
```

O mapeamento TypeScript/Drizzle fica em:

```text
frontend/src/lib/db/schema.ts
```

A conexão com o banco fica em:

```text
frontend/src/lib/db/index.ts
```

## Banco local

O PostgreSQL roda via Docker Compose e é publicado no host somente em:

```text
127.0.0.1:5433
```

A porta do banco não deve ser exposta pelo Cloudflare Tunnel nem diretamente à internet.

Consulte `backend/postgres/README.md` para criação do banco e aplicação das migrations.

## Regra de migrations

Migrations já aplicadas nunca devem ser editadas. Mudanças de schema recebem uma migration incremental nova, aplicada em ordem numérica.

Antes de qualquer operação destrutiva em ambiente com dados, valide backup e restauração.
