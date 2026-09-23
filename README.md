# Canhoto Digital — Rildon Eletropeças

[![CI](https://github.com/hicksonmartinsmenezes-jpg/Canhoto---Digital/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/hicksonmartinsmenezes-jpg/Canhoto---Digital/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/hicksonmartinsmenezes-jpg/Canhoto---Digital)](https://github.com/hicksonmartinsmenezes-jpg/Canhoto---Digital/releases/latest)

**Versão atual: 2.0.0**

Sistema interno da Rildon Eletropeças para registrar, acompanhar e auditar entregas, centralizando a operação administrativa e o fluxo utilizado pelos motoristas.

## Visão geral

O Canhoto Digital reúne em uma única aplicação:

- Dashboard operacional com entregas, alertas, atividade recente e motoristas em rota;
- cadastro, edição, acompanhamento e histórico de entregas;
- área mobile para o motorista;
- abertura de rota no Waze;
- geocodificação automática de endereço + CEP;
- foto da entrega + assinatura, com comprovante Pix opcional e separado;
- gestão de colaboradores, motoristas e veículos;
- relatórios operacionais;
- central de treinamentos;
- autenticação separada para Admin, Gestor de setor e Motorista;
- backup do PostgreSQL junto dos comprovantes físicos.

### Destaques da versão 2.0

A versão 2.0 consolida a nova experiência do motorista e a camada de localização da aplicação:

- painel mobile reorganizado;
- quilometragem percorrida no dia calculada pela trilha de GPS durante entregas em rota;
- histórico de entregas com busca e filtros;
- página de detalhes da entrega;
- mini mapa do destino;
- navegação priorizando latitude e longitude;
- geocoder local com geocodebr + CNEFE/IBGE;
- Photon/OpenStreetMap como fallback;
- coordenadas persistidas no PostgreSQL;
- melhorias visuais e operacionais no Dashboard.

## Arquitetura

```text
Windows 11 — máquina da loja
│
├── Next.js 16 + React 19
│   ├── Portal Admin
│   ├── Área /motorista
│   ├── Server Components
│   ├── Server Actions / Route Handlers
│   └── Proxy de autenticação e isolamento por hostname
│
├── Drizzle ORM
│
└── Docker Desktop / WSL2
    ├── PostgreSQL 16
    │   └── volume persistente
    │
    └── Geocoder local
        └── geocodebr + CNEFE/IBGE
```

Não existe um backend Node/Express separado. A camada principal de servidor vive no próprio Next.js, utilizando Server Components, Server Actions, Route Handlers e módulos `server-only`.

O PostgreSQL é publicado somente em `127.0.0.1:5433` e não deve ser exposto pelo Cloudflare Tunnel.

| Serviço | Porta |
| --- | ---: |
| Next.js — desenvolvimento | `3002` |
| Next.js — produção | `3003` |
| PostgreSQL | `5433` |
| Geocoder local | `8001` |

## Stack

| Camada | Tecnologias |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend da aplicação | Next.js Server Actions, Route Handlers e módulos `server-only` |
| Banco | PostgreSQL 16, Drizzle ORM, postgres.js |
| Autenticação | bcrypt, sessões HttpOnly assinadas com HMAC-SHA256 |
| Mapas | Leaflet, React Leaflet, OpenStreetMap |
| Geocodificação | geocodebr + CNEFE/IBGE, Photon/OpenStreetMap |
| Infraestrutura | Docker Compose, Windows 11, WSL2 |
| Acesso externo | Cloudflare Tunnel somente para a área do motorista |
| Qualidade | ESLint, TypeScript, Vitest, Playwright, Knip, Lighthouse |
| Backup | PostgreSQL + comprovantes físicos + relatórios exportados + manifesto de integridade |

## Estrutura do projeto

```text
Canhoto---Digital/
├── backend/
│   ├── geocoder/
│   └── postgres/
│       └── migrations/
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   └── src/proxy.ts
│
├── ops/
│   ├── backup/
│   ├── cloudflare/
│   └── windows/
│
├── scripts/
├── docker-compose.yml
└── README.md
```

## Executando localmente

### 1. Infraestrutura

Na raiz do projeto, crie o arquivo de ambiente:

```powershell
Copy-Item .env.example .env
```

Depois valide e suba os serviços:

```powershell
docker compose config --quiet
docker compose up -d postgres
docker compose build geocoder
docker compose up -d geocoder
docker compose ps
```

As migrations ficam em `backend/postgres/migrations` e são aplicadas em ordem numérica.

> **Importante:** nunca execute `docker compose down -v` em um ambiente com dados sem possuir um backup validado.

### 2. Frontend

Crie `frontend/.env.local` a partir de `frontend/.env.example` e configure as variáveis do ambiente.

Depois:

```powershell
cd frontend
npm ci
npm run dev
```

A aplicação de desenvolvimento ficará disponível na porta `3002`.

### Produção

```powershell
cd frontend
npm ci
npm run build
npm run start
```

A aplicação de produção utiliza a porta `3003`.

## Variáveis de ambiente

### Raiz — `.env`

| Variável | Uso |
| --- | --- |
| `CANHOTO_POSTGRES_DB` | nome do banco PostgreSQL |
| `CANHOTO_POSTGRES_USER` | usuário do banco |
| `CANHOTO_POSTGRES_PASSWORD` | senha do banco |
| `CANHOTO_POSTGRES_PORT` | porta local do PostgreSQL |
| `CANHOTO_GEOCODER_PORT` | porta local do geocoder |

### Frontend — `frontend/.env.local`

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | conexão do Next.js com PostgreSQL |
| `ADMIN_SESSION_SECRET` | assinatura da sessão do Admin |
| `MOTORISTA_SESSION_SECRET` | assinatura da sessão do Motorista |
| `COLABORADOR_SESSION_SECRET` | assinatura da sessão do Gestor de setor |
| `PUBLIC_MOTORISTA_HOST` | hostname público exclusivo da área do motorista |
| `CANHOTO_UPLOAD_DIR` | diretório de fotos, comprovantes Pix e assinaturas |
| `CANHOTO_RELATORIOS_DIR` | diretório onde os CSVs exportados são arquivados automaticamente |
| `GEOCODER_URL` | endereço interno do geocoder local |
| `NEXT_PUBLIC_MAP_TILE_URL` | origem dos tiles do mini mapa |
| `DEV_AUTH_BYPASS` | bypass opcional apenas para desenvolvimento local |

Nunca versione arquivos `.env`, segredos reais, dumps do banco, comprovantes ou relatórios operacionais exportados.

## Perfis de acesso

| Perfil | Acesso |
| --- | --- |
| **Admin** | acesso administrativo completo |
| **Gestor de setor** | acesso operacional com dados escopados ao setor nas áreas já implementadas |
| **Motorista** | acesso exclusivo à área `/motorista` e às próprias entregas |

### Criar o primeiro Admin

Depois de configurar o banco e `frontend/.env.local`:

```powershell
.\scripts\criar-admin.ps1
```

A senha é solicitada de forma oculta e somente o hash bcrypt é persistido.

### Gestor de setor

O acesso pode ser configurado pela tela **Colaboradores**, escolhendo o papel `gestor_setor` e definindo uma senha.

Também existe o script:

```powershell
.\scripts\criar-gestor-setor.ps1
```

O colaborador precisa estar ativo e possuir um setor definido.

## Área do motorista

O motorista utiliza telefone + PIN e possui uma sessão independente do Portal Admin.

O fluxo principal é:

```text
Entrega cadastrada
      ↓
Endereço geocodificado
      ↓
Entrega atribuída ao motorista
      ↓
Motorista inicia a entrega
      ↓
Localização registrada
      ↓
Rota aberta no Waze
      ↓
Foto da entrega + assinatura do cliente
      ↓
Comprovante Pix opcional (quando aplicável)
      ↓
Entrega concluída
      ↓
Histórico
```

A autorização é validada no servidor: uma entrega só pode ser acessada e alterada pelo motorista ao qual ela pertence.

## Geocodificação e mapas

A geocodificação usa duas camadas:

1. **geocodebr + CNEFE/IBGE** — serviço local e fonte principal;
2. **Photon/OpenStreetMap** — fallback quando o serviço local não retorna um ponto considerado confiável.

Quando existem coordenadas persistidas, o Waze recebe latitude e longitude. Caso contrário, o sistema mantém o fallback por endereço textual.

O mini mapa utiliza Leaflet e OpenStreetMap.

## Segurança

- Portal Admin protegido por e-mail, senha e sessão HttpOnly assinada;
- Gestor de setor possui sessão própria;
- Motorista possui sessão independente por telefone + PIN;
- Server Actions administrativas validam autenticação e autorização no servidor;
- entregas do motorista são filtradas pelo ID derivado da própria sessão;
- o hostname público do motorista não expõe o Portal Admin;
- PostgreSQL e geocoder ficam vinculados ao localhost;
- segredos e arquivos operacionais não devem ser versionados.

Quando `PUBLIC_MOTORISTA_HOST` está configurado, o hostname público aceita somente rotas `/motorista`. As rotas administrativas permanecem disponíveis apenas pelo acesso interno.

## Qualidade e CI

A esteira de CI executa verificações de banco, código, testes e aplicação:

```text
postgres-schema
security-audit
lint
typecheck
knip
unit-tests
build
e2e
lighthouse
commitlint
```

Comandos úteis no frontend:

```powershell
npm run lint
npm run typecheck
npm run knip
npm run test
npm run build
npm run test:e2e
```

## Arquivo local e backup

Os anexos de cada entrega são organizados por cliente e pelo número da entrega:

```text
storage/uploads/entregas/
└── joao-da-silva/
    ├── entrega-000123/
    │   ├── foto-entrega-....jpg
    │   ├── comprovante-pix-....jpg
    │   └── assinatura-....png
    └── entrega-000157/
        ├── foto-entrega-....jpg
        └── assinatura-....png
```

O nome do cliente é normalizado para um nome de pasta seguro, sem acentos e em minúsculas. O número global da entrega mantém entregas diferentes separadas mesmo quando dois clientes possuem nomes iguais.

Cada exportação feita em **Relatórios** continua sendo baixada pelo navegador e também recebe uma cópia automática em:

```text
storage/relatorios/
└── relatorio-entregas_2026-09-01_a_2026-09-30_20260923-153000_ab12cd34.csv
```

O caminho pode ser alterado por `CANHOTO_RELATORIOS_DIR`.

Cada backup válido reúne banco, comprovantes físicos e relatórios arquivados no mesmo pacote:

```text
backups/canhoto/canhoto-AAAAMMDD-HHMMSS/
├── database.dump
├── uploads.zip
├── relatorios.zip
└── manifest.json
```

O `manifest.json` registra hashes SHA-256 e informações de integridade. O processo de restauração valida o banco, os arquivos físicos, as referências existentes em `entrega_anexos` e o arquivo de relatórios quando presente.

Para detalhes de operação, agendamento, Cloudflare Tunnel e recuperação, consulte:

```text
ops/README.md
```

## Estado do projeto

A versão **2.0.0** representa a consolidação da área do motorista, da geocodificação automática e das melhorias operacionais do Dashboard.

O desenvolvimento continua em ciclos curtos, utilizando branches, Pull Requests e a esteira completa de CI antes de integrar mudanças à `main`.
