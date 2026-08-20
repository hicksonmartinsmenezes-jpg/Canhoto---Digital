# Canhoto Digital â€” instruÃ§Ãµes para agentes

Este arquivo Ã© lido por agentes de IA (Claude, Cursor, Copilot, Codex CLI, etc.) antes de propor ou implementar mudanÃ§as neste repositÃ³rio. Ver `README.md` para visÃ£o geral do projeto, stack e como rodar localmente.

## Fluxo de trabalho: Issues + Pull Requests (obrigatÃ³rio a partir de 20/08/2026)

Toda mudanÃ§a no cÃ³digo â€” correÃ§Ã£o, melhoria ou nova funÃ§Ã£o â€” segue este processo:

1. **Abrir (ou localizar) uma Issue antes de implementar.** Toda Issue recebe exatamente um destes labels:
   - `correÃ§Ã£o` â€” conserta um comportamento que estÃ¡ errado.
   - `melhoria` â€” aprimora algo que jÃ¡ existe (performance, UX, refactor, etc.).
   - `nova funÃ§Ã£o` â€” adiciona uma funcionalidade que nÃ£o existia.
2. **Implementar em uma branch**, nunca direto na `main`.
3. **Abrir um Pull Request** da branch para a `main`. Todo PR precisa ter, na descriÃ§Ã£o:
   - **Issue relacionada** â€” referenciar com `Closes #<nÃºmero>` (ou `Refs #<nÃºmero>` se nÃ£o fechar sozinho).
   - **O que mudou** â€” resumo objetivo das mudanÃ§as.
   - **Como foi validado** â€” o que foi rodado/testado antes de abrir o PR (lint, typecheck, build, teste manual, etc.) e o resultado.
   - **Riscos, limitaÃ§Ãµes e prÃ³ximos passos** â€” o que pode quebrar, o que ficou de fora do escopo, o que falta pra fechar o assunto de vez.

   O arquivo `.github/pull_request_template.md` jÃ¡ traz essas seÃ§Ãµes prontas â€” preencher cada uma, nÃ£o apagar.
4. SÃ³ depois de revisado (por Hickson ou por outro agente), o PR Ã© mergeado na `main`.

Isso vale para qualquer agente trabalhando neste repositÃ³rio, independente do modelo por trÃ¡s.

## ObservaÃ§Ãµes operacionais

- O ambiente do Claude (Cowork) nÃ£o tem rota de rede direta atÃ© o GitHub â€” nem para `git push`/`pull` (feito via ponte remota com o dispositivo do Hickson) nem para a API do GitHub (o proxy do sandbox bloqueia `api.github.com` por repositÃ³rio, mesmo com token vÃ¡lido). AÃ§Ãµes que dependem de rede real no GitHub precisam ser feitas com um token rodando num ambiente com rede de verdade (ex. o PowerShell do Hickson), ou pelo prÃ³prio Hickson.
- A pasta de trabalho fica sincronizada via OneDrive; comandos `git` rodados atravÃ©s da ponte remota do Claude podem deixar `.git/index.lock`/`HEAD.lock`/objetos temporÃ¡rios presos (o ambiente nÃ£o consegue apagar esses arquivos). Se aparecer `Unable to create '.git/index.lock': File exists`, Ã© isso â€” mover o lock pra fora do `.git` resolve.
- Commits sÃ£o agrupados por entrega coerente (branch/PR), nÃ£o a cada ajuste isolado.

## DocumentaÃ§Ã£o do projeto

DecisÃµes de produto, modelo de dados e histÃ³rico de decisÃµes ficam no projeto Claude "Canhoto Rildon EletropeÃ§as" (fora deste repositÃ³rio).
