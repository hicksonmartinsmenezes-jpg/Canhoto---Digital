# Auditoria de Segurança — Área do Motorista

## Objetivo

Preparar o Canhoto Digital para receber futuramente um aplicativo/PWA de motorista desenvolvido por terceiros, sem implementar o aplicativo nesta etapa.

A regra principal é: **o aplicativo é um cliente; o Canhoto Digital continua sendo a fonte de verdade e responsável pela autorização.**

## Situação atual

### Pontos já protegidos

1. A identidade do motorista é obtida da sessão assinada, e não de um `motoboyId` enviado pelo cliente.
2. A identidade da sessão é validada novamente no banco e exige que o motorista esteja ativo.
3. As operações de iniciar e confirmar entrega verificam no servidor se a entrega pertence ao motorista autenticado.
4. `iniciarEntrega` só permite a transição de uma entrega pendente sem `hora_saida`.
5. `confirmarEntrega` só permite a confirmação de uma entrega pendente que já tenha `hora_saida`.
6. As ações são executadas no servidor e possuem rate limit.
7. A sessão do motorista utiliza cookie assinado, `httpOnly`, `sameSite` e `secure` em produção.
8. A leitura operacional do motorista agora usa `getEntregasDoMotoristaAtual()`, que resolve a identidade no servidor sem receber `motoboyId` do caller.

## Pontos ainda pendentes

### Leitura

A função antiga `getEntregasDoMotorista(motoboyId)` permanece no módulo legado e deve ser removida ou encapsulada posteriormente, para evitar que novos callers usem uma API que aceite identidade externa.

### Escrita

O cliente motorista não deve conseguir alterar diretamente `motoboy_id`, valores/pagamento, `cadastrado_por`, dados de caixa, número/data administrativa ou status fora das transições autorizadas. As operações devem ser comandos específicos.

### Anexos

Ainda precisamos fechar autorização, tipos, tamanho, MIME, associação à entrega, ator da captura e acesso posterior.

### Histórico

O trigger atual usa `cadastrado_por` como `alterado_por`. Isso pode atribuir uma mudança ao usuário que cadastrou a entrega em vez do ator que executou a ação. Precisa ser corrigido antes da integração.

### RLS / service role

A autenticação do motorista é própria, por sessão assinada. Não devemos aplicar RLS baseado em `auth.uid()` sem uma ponte de identidade definida. Enquanto isso, qualquer uso de cliente privilegiado deve ser precedido de autorização explícita no servidor.

## Critério de aceite

Um motorista autenticado não pode acessar, alterar, confirmar ou anexar dados de uma entrega pertencente a outro motorista, mesmo manipulando IDs ou payloads enviados pelo aplicativo.

## Próxima etapa

Executar o roteiro `docs/TESTES_SEGURANCA_MOTORISTA.md`, corrigir histórico/anexos e validar novamente o isolamento antes de criar a camada de integração do futuro aplicativo.
