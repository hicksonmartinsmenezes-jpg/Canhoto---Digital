# Segurança — Canhoto Digital

Ferramenta interna da Rildon Eletropeças (Aracaju/SE), sem usuários externos e sem programa público de divulgação de vulnerabilidades. Se você encontrar um problema de segurança neste repositório, avise diretamente o Hickson (mantenedor) em vez de abrir uma Issue pública.

## Postura atual (revisão de 20/08/2026)

- **Sem autenticação real ainda.** Qualquer pessoa com a URL do site consegue ler e escrever dados hoje — é a lacuna de segurança mais importante em aberto (ver pendência em `claude/modelo-de-dados-site.md`, no projeto Claude do repositório). Até login real existir, as Server Actions de escrita (`criarEntrega`, `atualizarEntrega`, `excluirEntrega`, `criarMotoboy`, `atualizarMotoboy`, `excluirMotoboy`) passam por um rate limit simples (`frontend/src/lib/rate-limit.ts`) que reduz abuso trivial, mas não substitui autenticação.
- **Chave privilegiada do Supabase (`SUPABASE_SERVICE_ROLE_KEY`) só é lida no servidor** (`frontend/src/lib/supabase/admin.ts`, marcado `import "server-only"`) — nunca é enviada ao navegador. `.env.local` está no `.gitignore`.
- **`npm audit` no `frontend`: 0 vulnerabilidades** (prod + dev) na data desta revisão. Recomenda-se rodar de novo periodicamente.
- **Dados pessoais armazenados**: telefone de contato do cliente (`entregas.cliente_telefone`) e dados de colaboradores (nome, e-mail, cargo). Nenhuma revisão jurídica/LGPD formal foi feita ainda — recomendação registrada em `AGENTS.md` para o time jurídico/compliance da Rildon avaliar a necessidade de um aviso interno de tratamento de dados.
- **Esteira de qualidade** (lint, typecheck, testes, build, e2e, orçamento de performance) roda em todo Pull Request — ver `.github/workflows/ci.yml` e a seção "Esteira de qualidade" em `AGENTS.md`.

## Reportando um problema

Avise o Hickson diretamente (não abra uma Issue pública descrevendo a vulnerabilidade em detalhe, caso envolva exposição de dados).
