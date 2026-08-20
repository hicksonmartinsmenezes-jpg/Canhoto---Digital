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

## Documentação do projeto

Decisões de produto, modelo de dados e histórico de decisões ficam no projeto Claude "Canhoto Rildon Eletropeças" (fora deste repositório).
