# Frontend — Canhoto Digital

Aplicação Next.js responsável pelo Portal Admin, pela área mobile do motorista e pela camada server-side do sistema.

## Como rodar

Na raiz do repositório, suba primeiro o PostgreSQL:

```powershell
docker compose up -d postgres
```

Depois:

```powershell
cd frontend
Copy-Item .env.example .env.local
npm ci
npm run dev
```

Desenvolvimento: `http://localhost:3002`.

Produção local:

```powershell
npm run build
npm run start
```

Produção responde em `http://localhost:3003`.

## Estrutura

```text
src/
├── app/                  # App Router, Server Actions e Route Handlers
├── components/           # UI e componentes de domínio
├── lib/
│   ├── db/               # Drizzle + conexão PostgreSQL
│   ├── data/             # leituras server-only
│   └── ...               # autenticação, storage e utilitários
├── proxy.ts              # proteção otimista de rotas/hostname
└── types/database.ts     # tipos de domínio compartilhados
```

O schema persistente oficial fica em `../backend/postgres/migrations/` e em `src/lib/db/schema.ts`.

## Qualidade

```powershell
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
npm run knip
```

O CI também valida migrations PostgreSQL, backup/restore completo e Lighthouse.
