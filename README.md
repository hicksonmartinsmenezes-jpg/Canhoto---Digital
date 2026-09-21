# Canhoto Digital — Rildon Eletropeças

Sistema interno para registrar e acompanhar entregas realizadas por motoboys a clientes externos.

O fluxo atual cobre:

- cadastro da entrega;
- saída do motorista;
- confirmação de recebimento pelo cliente;
- conferência de caixa quando aplicável;
- histórico de alterações e responsáveis;
- Portal Admin para operação interna;
- área mobile-first do motorista.

## Arquitetura

```text
Windows 11 — máquina da loja
│
├── Next.js 16
│   ├── Portal Admin
│   ├── Área /motorista
│   ├── Server Components
│   └── Server Actions
│
├── Drizzle ORM
│
└── Docker Desktop / WSL2
    └── PostgreSQL 16
        └── volume persistente
```

O PostgreSQL é publicado no host somente em `127.0.0.1:5433`. A porta do banco nunca deve ser exposta pelo Cloudflare Tunnel.

Produção do Next.js usa a porta `3003`. Desenvolvimento continua em `3002`.

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Drizzle ORM
- PostgreSQL 16
- postgres.js
- Docker Compose
- bcrypt para senha do Portal Admin
- cookies assinados com HMAC-SHA256 para sessões Admin e motorista
- Cloudflare Tunnel para acesso externo da área do motorista
- backup local do PostgreSQL com opção de cópia para pasta sincronizada externa

Não existe um serviço Node/Express separado. O backend da aplicação vive no próprio Next.js através de Server Components, Server Actions e módulos server-only.

## Estrutura relevante

```text
Canhoto---Digital/
├── docker-compose.yml
├── backend/
│   └── postgres/
│       └── migrations/
├── frontend/
│   ├── src/lib/db/
│   ├── src/lib/data/
│   └── src/app/
├── ops/
│   ├── backup/
│   ├── cloudflare/
│   └── windows/
└── scripts/
```

## Banco local

Na raiz do projeto:

```powershell
Copy-Item .env.example .env
docker compose config --quiet
docker compose up -d postgres
docker compose ps
```

As migrations ficam em `backend/postgres/migrations` e devem ser aplicadas em ordem numérica.

**Nunca execute `docker compose down -v` em produção sem backup validado.** O parâmetro `-v` remove o volume persistente do banco.

## Frontend

Crie `frontend/.env.local` a partir de `frontend/.env.example` e configure localmente:

- `DATABASE_URL`;
- `ADMIN_SESSION_SECRET`;
- `MOTORISTA_SESSION_SECRET`;
- `PUBLIC_MOTORISTA_HOST` quando o Cloudflare Tunnel for configurado.

Depois:

```powershell
cd frontend
npm ci
npm run build
npm run start
```

Produção responde em:

```text
http://localhost:3003
```

## Primeiro usuário Admin

Depois de aplicar todas as migrations e configurar `frontend/.env.local`:

```powershell
.\scripts\criar-admin.ps1
```

A senha é solicitada de forma oculta. O banco recebe somente o hash bcrypt.

## Segurança

O Portal Admin usa e-mail + senha e sessão assinada. Toda Server Action administrativa valida a sessão antes de acessar o banco.

A área do motorista continua usando telefone + PIN e sessão própria assinada. A identidade do motoboy vem sempre da sessão; IDs enviados pelo cliente não definem quem está autenticado.

Quando `PUBLIC_MOTORISTA_HOST` estiver configurado, o hostname público do Cloudflare só aceita rotas `/motorista`. O Portal Admin deve continuar sendo acessado pela rede interna da empresa.

Segredos reais ficam somente em arquivos locais ignorados pelo Git. Nunca versionar senhas, tokens de infraestrutura, dumps, comprovantes ou segredos de sessão.

## Operação

- `ops/cloudflare/`: exemplo do Cloudflare Tunnel;
- `ops/backup/`: backup `pg_dump`, cópia opcional para pasta sincronizada e teste de restauração;
- `ops/windows/`: scripts para inicialização e agendamento no Windows.

Antes de considerar o backup pronto para produção, é obrigatório executar um backup real e restaurá-lo em um banco de teste.
