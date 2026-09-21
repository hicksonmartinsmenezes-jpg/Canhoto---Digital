# Backend — Canhoto Digital

O backend persistente usa PostgreSQL 16 local. Não existe Supabase nem um serviço Node/Express separado.

A camada de servidor da aplicação vive no Next.js por meio de Server Components, Server Actions e Route Handlers, acessando o banco com Drizzle ORM.

## Estrutura

```text
backend/
└── postgres/
    ├── README.md
    └── migrations/
        ├── 0001_baseline.sql
        └── ...
```

Mapeamento Drizzle:

```text
frontend/src/lib/db/schema.ts
```

Conexão:

```text
frontend/src/lib/db/index.ts
```

## Banco local

O PostgreSQL roda via Docker Compose e é publicado somente em `127.0.0.1:5433`.

Consulte `backend/postgres/README.md` para criação do banco e aplicação das migrations.

## Regra de migrations

Migrations já aplicadas não devem ser editadas. Toda mudança estrutural recebe uma migration incremental nova.

Antes de operações destrutivas, valide o backup completo e um restore real.
