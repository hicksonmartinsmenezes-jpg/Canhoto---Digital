# Canhoto Digital — instruções para agentes

Este arquivo deve ser lido antes de propor ou implementar mudanças neste repositório. Consulte também o `README.md`.

## Fluxo de trabalho obrigatório

Toda mudança de código segue:

1. Abrir ou localizar uma Issue, com exatamente um label entre `correção`, `melhoria` ou `nova função`.
2. Implementar em branch própria. Nunca alterar `main` diretamente.
3. Abrir Pull Request para a branch-base correta. PRs empilhados são permitidos durante sequências de estabilização, desde que a cadeia permaneça explícita.
4. O PR deve registrar: o que mudou, como foi validado, riscos/limitações e próximos passos.
5. Fazer merge somente depois de revisão e checks verdes.

Commits seguem Conventional Commits conforme `.commitlintrc.json`.

## Arquitetura atual

O sistema roda em uma máquina física Windows 11 da loja.

```text
Next.js 16
├── Portal Admin
├── Área do motorista
├── Server Components
└── Server Actions
        ↓
Drizzle ORM
        ↓
PostgreSQL 16
        ↓
Docker Desktop / WSL2
```

Não criar serviço Node/Express separado sem necessidade concreta. Server Components e Server Actions são a camada backend deste projeto.

O PostgreSQL da aplicação usa `127.0.0.1:5433` no host. Produção do Next.js usa `3003`.

## Banco e migrations

- schema PostgreSQL: `backend/postgres/migrations/`;
- mapeamento Drizzle: `frontend/src/lib/db/schema.ts`;
- conexão: `frontend/src/lib/db/index.ts`;
- acesso de leitura: `frontend/src/lib/data/*`;
- mutações: `frontend/src/app/**/actions.ts`.

Toda mudança estrutural no banco deve ganhar migration incremental. Não editar uma migration que já possa ter sido aplicada numa instalação.

Não usar `docker compose down -v` em ambiente com dados sem backup confirmado.

### Auditoria

Mudanças de status de entrega devem registrar o ator real na mesma transação:

- colaborador;
- usuário Admin;
- motoboy.

Nunca inferir o ator usando `cadastrado_por`.

Cadastros referenciados por entregas/histórico devem ser desativados em vez de apagados.

## Autenticação e autorização

### Portal Admin

- tabela própria `usuarios_admin`;
- senha armazenada somente como bcrypt;
- sessão em cookie HttpOnly assinado com HMAC-SHA256;
- segredo em `ADMIN_SESSION_SECRET`;
- Server Actions administrativas validam a sessão antes de acessar o banco.

### Motorista

- login por telefone + PIN;
- PIN armazenado apenas como hash;
- sessão em cookie assinado;
- identidade sempre derivada da sessão;
- toda leitura/escrita de entrega valida `motoboy_id` no servidor;
- um motorista nunca pode acessar ou alterar entrega de outro.

O Proxy (`frontend/src/proxy.ts`) usa apenas validação criptográfica de cookies. Não fazer consulta PostgreSQL a partir do Proxy.

## Exposição pela internet

Cloudflare Tunnel deve apontar somente para o Next.js em `127.0.0.1:3003`.

Nunca publicar PostgreSQL/porta 5433 no Tunnel.

Quando `PUBLIC_MOTORISTA_HOST` estiver configurado, o middleware retorna 404 para rotas que não começam com `/motorista` quando acessadas por esse hostname. O Portal Admin permanece para uso interno da empresa.

## Segredos

Nunca versionar:

- `.env`;
- `.env.local`;
- `.env.backup`;
- senhas;
- chaves R2;
- credenciais Cloudflare;
- segredos de sessão.

Arquivos `.env.example` contêm somente placeholders.

## Esteira de qualidade

Todo Pull Request executa `.github/workflows/ci.yml`, inclusive PRs empilhados. `main` também executa a esteira após merge.

| Job | Validação |
|---|---|
| `postgres-schema` | sobe PostgreSQL descartável, aplica todas as migrations e valida tabelas |
| `security-audit` | falha se o npm reportar vulnerabilidade high/critical |
| `lint` | ESLint |
| `typecheck` | tipos do Next + TypeScript |
| `knip` | código/dependências não usados |
| `unit-tests` | Vitest |
| `build` | build de produção do Next |
| `e2e` | smoke tests Playwright |
| `lighthouse` | orçamento de performance/acessibilidade |
| `commitlint` | Conventional Commits |

O build roda sem `DATABASE_URL` no CI de propósito: `getDb()` retorna `null` e as telas de leitura exibem o estado vazio. O job `postgres-schema` é responsável por validar o banco real.

E2E pode usar `E2E_AUTH_BYPASS=true` somente junto com `CI=true`. Em desenvolvimento local, `DEV_AUTH_BYPASS=true` é opcional e nunca deve ser usado em produção.

## Rate limit

As Server Actions sensíveis usam o rate limiter simples em memória existente.

Esse modelo é suficiente enquanto houver uma única instância do Next.js na máquina da loja. Se a aplicação passar a rodar em múltiplas instâncias, substituir por armazenamento compartilhado; não expandir a solução em memória para fingir coordenação distribuída.

## Backup e recuperação

Scripts operacionais ficam em `ops/backup/`.

Um backup só é considerado válido depois de um teste real de restauração. O script de teste restaura em banco separado e não deve sobrescrever o banco de produção.

## Princípios

- evitar overengineering;
- componentizar quando houver reutilização real;
- aplicar DRY com critério;
- procurar componentes/utilitários existentes antes de criar novos;
- preservar isolamento entre UI, regras de negócio e acesso a dados;
- não confiar em IDs/atributos sensíveis vindos do cliente;
- operações que alteram estado + auditoria devem ser transacionais;
- falhar fechado em autenticação e autorização.
