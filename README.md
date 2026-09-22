# Canhoto Digital — Rildon Eletropeças

[![CI](https://github.com/hicksonmartinsmenezes-jpg/Canhoto---Digital/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/hicksonmartinsmenezes-jpg/Canhoto---Digital/actions/workflows/ci.yml) [![Release](https://img.shields.io/github/v/release/hicksonmartinsmenezes-jpg/Canhoto---Digital)](https://github.com/hicksonmartinsmenezes-jpg/Canhoto---Digital/releases/latest)

**Versão atual: 2.0.0**

Sistema interno para registrar, acompanhar e auditar entregas realizadas por motoristas a clientes externos.

## Arquitetura

```text
Windows 11 — máquina da loja
│
├── Next.js 16 + React 19
│   ├── Portal Admin
│   ├── Área /motorista
│   ├── Server Components / Server Actions
│   └── Proxy de proteção de rotas/hostname
│
├── Drizzle ORM
│
└── Docker Desktop / WSL2
    ├── PostgreSQL 16
    │   └── volume persistente
    └── Geocoder local
        └── geocodebr + CNEFE/IBGE
```

O PostgreSQL é publicado no host somente em `127.0.0.1:5433`. A porta do banco nunca deve ser exposta pelo Cloudflare Tunnel.

Produção do Next.js usa a porta `3003`; desenvolvimento usa `3002`.

## Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Drizzle ORM
- PostgreSQL 16
- postgres.js
- Docker Compose
- geocodebr + CNEFE/IBGE para geocodificação local de endereços
- Photon/OpenStreetMap como fallback de geocodificação
- bcrypt para senha do Portal Admin
- HMAC-SHA256 para sessões Admin e motorista
- Cloudflare Tunnel para acesso externo da área do motorista
- backup completo de PostgreSQL + comprovantes físicos

Não existe um serviço Node/Express separado. O backend vive no próprio Next.js através de Server Components, Server Actions, Route Handlers e módulos `server-only`.

## Estrutura relevante

```text
Canhoto---Digital/
├── docker-compose.yml
├── backend/
│   ├── geocoder/
│   └── postgres/migrations/
├── frontend/
│   ├── src/lib/db/
│   ├── src/lib/data/
│   ├── src/app/
│   └── src/proxy.ts
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
docker compose build geocoder
docker compose up -d geocoder
docker compose ps
```

As migrations ficam em `backend/postgres/migrations` e são aplicadas em ordem numérica.

**Nunca execute `docker compose down -v` em ambiente com dados sem backup validado.**

## Frontend

Crie `frontend/.env.local` a partir de `frontend/.env.example` e configure:

- `DATABASE_URL`;
- `ADMIN_SESSION_SECRET`;
- `MOTORISTA_SESSION_SECRET`;
- `COLABORADOR_SESSION_SECRET`, usado pelo login de Gestor de setor;
- `PUBLIC_MOTORISTA_HOST`, quando houver hostname público;
- `CANHOTO_UPLOAD_DIR`, somente se quiser alterar o diretório padrão de comprovantes;
- `GEOCODER_URL`, endereço interno do geocoder local (por padrão `http://127.0.0.1:8001`).

Desenvolvimento:

```powershell
cd frontend
npm ci
npm run dev
```

Produção:

```powershell
npm run build
npm run start
```

## Primeiro usuário Admin

Depois de aplicar as migrations e configurar `frontend/.env.local`:

```powershell
.\scripts\criar-admin.ps1
```

A senha é solicitada de forma oculta. O banco recebe somente o hash bcrypt.

## Login de colaborador (gestor de setor)

Além do Admin (acesso total) e do Motorista (só `/motorista`), um colaborador
com papel `gestor_setor` pode logar em `/colaborador/login` com acesso quase
igual ao Admin, mas escopado ao setor dele (hoje: Dashboard e lista de
Entregas — outras telas ainda não são filtradas por setor).

Dá pra dar esse acesso direto pela tela **Colaboradores**: ao criar ou editar
um colaborador, escolha o papel "Gestor de setor" e defina a senha de acesso
no próprio formulário (mínimo 4 caracteres). Não precisa de terminal.

Alternativa por script, útil pra automações/onboarding em lote:

```powershell
.\scripts\criar-gestor-setor.ps1
```

Tanto pela tela quanto pelo script, o colaborador precisa já existir e ter um
setor definido.

## Segurança

O Portal Admin usa e-mail + senha e sessão HttpOnly assinada. Toda Server Action administrativa valida autenticação/autorização no servidor.

O login de colaborador (gestor de setor) usa o mesmo mecanismo, numa sessão própria e separada da do Admin.

A área do motorista usa telefone + PIN, sessão própria assinada e valida a propriedade da entrega no servidor.

Quando `PUBLIC_MOTORISTA_HOST` estiver configurado, o hostname público aceita somente rotas `/motorista`; o Portal Admin permanece para uso interno.

Segredos reais, dumps e comprovantes nunca devem ser versionados.

## Backup e recuperação

Cada backup válido reúne banco e arquivos físicos no mesmo pacote:

```text
backups/canhoto/canhoto-AAAAMMDD-HHMMSS/
├── database.dump
├── uploads.zip
└── manifest.json
```

O manifesto guarda SHA-256 e a restauração valida as tabelas, os arquivos e as referências de `entrega_anexos`.

Consulte `ops/README.md` para operação, Cloudflare Tunnel e recuperação.
