# Canhoto Digital — instruções para agentes

Este arquivo é lido por agentes de IA (Claude, Cursor, Copilot, Codex CLI, etc.) antes de propor ou implementar mudanças neste repositório. Ver `README.md` para visão geral do projeto, stack e como rodar localmente.

## Fluxo de trabalho: Issues + Pull Requests (obrigatório a partir de 20/08/2026)

Toda mudança no código — correção, melhoria ou nova função — segue este processo:

1. **Abrir (ou localizar) uma Issue antes de implementar.** Toda Issue recebe exatamente um destes labels:
   - `correção` — conserta um comportamento que está errado.
   - `melhoria` — aprimora algo que já existe (performance, UX, refactor, etc.).
   - `nova função` — adiciona uma funcionalidade que não existia.
2. **Implementar em uma branch**, nunca direto na `main`.
3. **Abrir um Pull Request** da branch para a `main`. Todo PR precisa ter, na descrição:
   - **Issue relacionada** — referenciar com `Closes #<número>` (ou `Refs #<número>` se não fechar sozinho).
   - **O que mudou** — resumo objetivo das mudanças.
   - **Como foi validado** — o que foi rodado/testado antes de abrir o PR (lint, typecheck, build, teste manual, etc.) e o resultado.
   - **Riscos, limitações e próximos passos** — o que pode quebrar, o que ficou de fora do escopo, o que falta pra fechar o assunto de vez.

   O arquivo `.github/pull_request_template.md` já traz essas seções prontas — preencher cada uma, não apagar.
4. Só depois de revisado (por Hickson ou por outro agente), o PR é mergeado na `main`.

Isso vale para qualquer agente trabalhando neste repositório, independente do modelo por trás.

## Observações operacionais

- O ambiente do Claude (Cowork) não tem rota de rede direta até o GitHub — nem para `git push`/`pull` (feito via ponte remota com o dispositivo do Hickson) nem para a API do GitHub (o proxy do sandbox bloqueia `api.github.com` por repositório, mesmo com token válido). Ações que dependem de rede real no GitHub precisam ser feitas com um token rodando num ambiente com rede de verdade (ex. o PowerShell do Hickson), ou pelo próprio Hickson.
- A pasta de trabalho fica sincronizada via OneDrive; comandos `git` rodados através da ponte remota do Claude podem deixar `.git/index.lock`/`HEAD.lock`/objetos temporários presos (o ambiente não consegue apagar esses arquivos). Se aparecer `Unable to create '.git/index.lock': File exists`, é isso — mover o lock pra fora do `.git` resolve.
- Commits são agrupados por entrega coerente (branch/PR), não a cada ajuste isolado.

## Esteira de qualidade (obrigatório a partir de 20/08/2026)

Todo PR contra a `main` roda automaticamente pelo GitHub Actions (`.github/workflows/ci.yml`). Nenhum código deveria entrar na `main` sem esses checks passando — ver "Configurar a branch protection" abaixo pra tornar isso obrigatório de fato no GitHub (hoje o workflow roda, mas nada impede um merge com check vermelho até essa configuração ser feita).

Jobs do CI (todos rodam com `working-directory: frontend`, exceto `commitlint`):

| Job | O que faz | Comando equivalente local |
|---|---|---|
| `lint` | ESLint | `npm run lint` |
| `typecheck` | Gera os tipos de rota do Next e roda o TypeScript | `npm run typecheck` |
| `knip` | Detecta arquivo morto, dependência não usada, export não usado | `npm run knip` |
| `unit-tests` | Testes unitários (Vitest) | `npm run test` |
| `build` | `next build` de produção — roda **sem** as variáveis do Supabase de propósito (ver nota abaixo) | `npm run build` |
| `e2e` | Testes de fumaça end-to-end (Playwright) — cada rota principal carrega, submenu da Sidebar, wizard de Adicionar Entrega, estado vazio de Motoristas | `npm run test:e2e` |
| `lighthouse` | Orçamento de performance (bundle de script, peso total, Core Web Vitals) contra `/` e `/canhotos` | ver `.lighthouserc.json` |
| `commitlint` | Valida que as mensagens de commit do PR seguem Conventional Commits (`feat:`, `fix:`, `chore:`, etc.) | — |

**Por que o `build`/`e2e` funcionam sem nenhum segredo do Supabase configurado no CI**: `@/lib/supabase/admin.ts` (`createAdminClient()`) devolve `null` quando as variáveis de ambiente não estão presentes, e toda a camada de leitura (`@/lib/data/entregas.ts`, `@/lib/data/motoboys.ts`) já trata esse `null` como "banco vazio" — mesmo comportamento visual de um Supabase real ainda sem dados (ver `claude/modelo-de-dados-site.md`). Isso significa que os testes E2E são só de fumaça (a tela carrega, os componentes de UI funcionam) — **não gravam nada real**, porque não existe um banco de teste dedicado. Se/quando o projeto crescer a ponto de precisar testar o fluxo de gravação de ponta a ponta, criar um projeto Supabase de teste separado e configurar os segredos correspondentes no GitHub Actions — não usar o banco de produção pra isso.

### Configurar a branch protection (fazer manualmente no GitHub, uma vez)

O Claude não tem como configurar isso via API (mesma limitação de rede já documentada acima). Hickson precisa fazer isso uma vez em **Settings → Branches → Add branch protection rule** (ou `Add rule`) pra `main`:
- Marcar **"Require a pull request before merging"**.
- Marcar **"Require status checks to pass before merging"** e selecionar os checks: `lint`, `typecheck`, `knip`, `unit-tests`, `build`, `e2e`, `commitlint` (o `lighthouse` pode ficar de fora dos obrigatórios no começo, já que os thresholds de performance ainda são só `warn` — ver `.lighthouserc.json` — não vale travar merge por causa dele ainda).
- Opcional, mas recomendado: marcar **"Require branches to be up to date before merging"**.

### Calibração do Knip (`frontend/knip.json`)

- `src/lib/supabase/client.ts` e `server.ts` estão em `entry` (não em `ignore`) de propósito: são os clientes Supabase com sessão de usuário, pré-construídos para quando o login real existir (ver "Ainda faltando" em `claude/modelo-de-dados-site.md`). Hoje nada os importa — colocar em `entry` evita que o Knip os marque como arquivo morto, sem esconder o uso real de `@supabase/ssr` que eles fazem (colocar em `ignore` faria o Knip parar de analisar o conteúdo deles, e a dependência apareceria como não usada por engano).
- `wait-on` está em `ignoreDependencies`: só é usado via `npx wait-on` dentro do `ci.yml`, nunca importado em código TypeScript — o Knip não teria como enxergar esse uso sozinho.
- As regras `exports`/`types` estão como `"warn"` (não travam o CI), diferente de `files`/`dependencies` que são `"error"`. Motivo: `src/types/database.ts` espelha o schema completo do banco e tem propositalmente alguns tipos ainda não usados em código (documentação do schema, uso futuro conforme mais telas usam mais tabelas) — travar nisso geraria atrito sem sinal real de problema. Arquivo morto de verdade e dependência não usada de verdade quase sempre SÃO um problema real (ver princípio "impedir reconstrução de componentes que já existem" abaixo) — por isso continuam travando o CI.

### Rate limit nas Server Actions de escrita

`@/lib/rate-limit.ts` aplica um limite simples (janela deslizante, em memória, por IP + ação) em toda Server Action que grava no banco (`criarEntrega`, `atualizarEntrega`, `excluirEntrega`, `criarMotoboy`, `atualizarMotoboy`, `excluirMotoboy`) — hoje qualquer pessoa com o link consegue chamá-las diretamente, já que não existe login real ainda. Limitação conhecida: é em memória do processo, então só funciona corretamente com uma instância de servidor (o caso de hoje). Se o deploy migrar pra múltiplas instâncias/serverless, trocar por um rate limiter externo compartilhado (ex. `@upstash/ratelimit`) em vez de expandir essa implementação.

### Revisão de segurança (feita em 20/08/2026)

- `npm audit` no `frontend`: **0 vulnerabilidades** (prod + dev) na data desta revisão. Rodar de novo periodicamente — não está automatizado no CI ainda (avaliar adicionar um job `npm audit --audit-level=high` mais pra frente, se fizer sentido).
- A `SUPABASE_SERVICE_ROLE_KEY` só é lida em `@/lib/supabase/admin.ts`, marcado com `import "server-only"` — nunca chega ao bundle do navegador. `.env.local` está no `.gitignore`.
- Server Actions do Next.js já têm proteção de origem embutida (recusam requisição com `Origin` diferente do host) — não é preciso implementar CSRF manualmente por cima disso.
- **Sem autenticação real ainda** (pendência já documentada em `claude/modelo-de-dados-site.md`) — hoje qualquer pessoa com a URL do site consegue ler e escrever tudo. O rate limit acima reduz abuso trivial, mas não substitui login. Login real continua sendo o item de segurança mais importante em aberto.
- **Termos de uso / política de privacidade / LGPD**: o Claude não pode redigir nem aprovar esses documentos em nome da empresa — isso exige revisão jurídica de verdade, e o sistema já lida com dado pessoal (telefone do cliente em `entregas.cliente_telefone`, dados de colaboradores). Recomendação: alguém do jurídico/compliance da Rildon avaliar se o Canhoto Digital precisa de um aviso interno de tratamento de dados (LGPD), mesmo sendo uma ferramenta interna — isso não foi feito nesta revisão e fica como pendência separada, fora do que o Claude pode resolver sozinho.

## Princípios de arquitetura (registrados em 20/08/2026, a pedido do Hickson)

Valem para qualquer agente propondo mudanças estruturais neste repositório:

- **Evitar overengineering.** Antes de adicionar uma ferramenta/camada nova, perguntar se o problema que ela resolve já existe de verdade neste projeto (porte: portal interno, um admin, sem login real, sem tráfego público) — não "pode ser útil algum dia". Exemplo aplicado: a esteira de qualidade acima ficou deliberadamente sem Datadog/New Relic/Stryker/Codecov/Upstash — ferramentas pagas ou que exigem massa crítica de testes que este projeto ainda não tem. Reavaliar quando o porte mudar (login real, múltiplos clientes, tráfego de verdade).
- **Evitar gargalos absurdos.** Não otimizar prematuramente, mas também não ignorar um N+1 óbvio ou uma consulta sem índice quando ela aparecer — os índices já previstos (`data`, `motoboy_id`, `caixa_id`, `status`, `forma_pagamento`, ver `claude/modelo-de-dados-site.md`) cobrem os filtros/agregações conhecidos hoje.
- **Componentizar desde o início.** Já é o padrão do projeto (`Card`, `Modal`, `Skeleton`, `EmptyState`, `PageHeader` etc. em `src/components/ui/`) — continuar extraindo peça reutilizável assim que o segundo uso aparecer, não só no terceiro.
- **Aplicar DRY com critério, sem abstração prematura.** Duplicar uma vez é aceitável; abstrair na primeira repetição costuma acertar a abstração errada. Esperar o padrão ficar claro (2-3 usos reais) antes de extrair.
- **Impedir reconstrução de componentes que já existem.** Antes de criar um componente/util novo, procurar em `src/components/ui/` e `src/lib/` se já existe algo parecido. O job `knip` do CI ajuda a pegar o caso inverso (código que ninguém usa mais, geralmente sobra de uma reconstrução que não removeu o antigo) — foi assim que `MotoboysEmRotaCard.tsx`, `StatusDonutChart.tsx` e `em-rota-mock.ts` (versões antigas do card de mapa/gráfico do Dashboard, já substituídas) foram encontrados e removidos nesta mesma revisão.
- **Separação entre backend e frontend**: este projeto usa Next.js (Server Components + Server Actions) direto contra o Supabase, sem um serviço de backend separado — decisão já registrada em `claude/recomendacoes-stack.md`. Isso NÃO significa que backend e frontend estão misturados: a lógica de acesso a dados vive isolada em `src/lib/data/*` e `src/app/**/actions.ts`, marcada com `"use server"`/`import "server-only"` — nunca chega ao bundle do navegador, que é a separação que importa de verdade aqui. Criar um serviço Node/Express separado só pra ter "backend e frontend em repositórios/processos diferentes" seria overengineering pro porte atual do projeto — não fazer isso sem uma razão concreta (ex. outro consumidor da mesma API além deste site).

## Documentação do projeto

Decisões de produto, modelo de dados e histórico de decisões ficam no projeto Claude "Canhoto Rildon Eletropeças" (fora deste repositório).
