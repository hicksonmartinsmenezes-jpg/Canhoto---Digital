# Auditoria de Segurança — Área do Motorista

## Objetivo

Preparar o Canhoto Digital para receber futuramente um aplicativo/PWA de motorista desenvolvido por terceiros, sem implementar o aplicativo nesta etapa.

A regra principal é: **o aplicativo é um cliente; o Canhoto Digital continua sendo a fonte de verdade e responsável pela autorização.**

## Escopo desta auditoria

- autenticação e sessão do motorista;
- autorização por motorista;
- acesso às entregas;
- início e confirmação de entrega;
- proteção contra manipulação de IDs;
- campos que o motorista não deve controlar;
- anexos e histórico;
- auditoria do ator que executou cada ação;
- testes necessários antes da integração futura.

## Situação atual

### Pontos já protegidos

1. A identidade do motorista é obtida da sessão assinada, e não de um `motoboyId` enviado pelo cliente.
2. A identidade da sessão é validada novamente no banco e exige que o motorista esteja ativo.
3. As operações de iniciar e confirmar entrega verificam no servidor se a entrega pertence ao motorista autenticado.
4. `iniciarEntrega` só permite a transição de uma entrega pendente sem `hora_saida`.
5. `confirmarEntrega` só permite a confirmação de uma entrega pendente que já tenha `hora_saida`.
6. As ações são executadas no servidor e possuem rate limit.
7. A sessão do motorista utiliza cookie assinado, `httpOnly`, `sameSite` e `secure` em produção.

## Riscos / pontos que ainda precisam ser fechados

### 1. Leitura das entregas

A função que carrega a lista do motorista deve sempre derivar o motorista da sessão no servidor. Não deve aceitar um ID arbitrário do cliente como critério de consulta.

**Critério:** motorista A nunca recebe dados de entrega pertencentes ao motorista B, mesmo alterando parâmetros da requisição.

### 2. Escrita de campos sensíveis

O cliente motorista não deve conseguir alterar diretamente:

- `motoboy_id`;
- `valor_pagamento`;
- `forma_pagamento`;
- `cadastrado_por`;
- `caixa_id`;
- `caixa_confirmou_em`;
- `numero`;
- `data` administrativa;
- status fora das transições explicitamente autorizadas.

As operações do motorista devem ser comandos específicos, e não uma atualização genérica da tabela `entregas`.

### 3. Anexos

Antes de liberar anexos para o futuro aplicativo, validar:

- quem pode criar um anexo;
- quais tipos são permitidos;
- limite de tamanho;
- validação de MIME/extensão;
- associação obrigatória com uma entrega pertencente ao motorista;
- identificação do ator que capturou o arquivo;
- acesso posterior ao arquivo;
- prevenção de substituição indevida de anexos.

### 4. Histórico / auditoria

O histórico precisa representar o **ator real da ação**.

A implementação atual do banco deve ser revisada porque o trigger de histórico utiliza `cadastrado_por` como `alterado_por`. Isso pode registrar o usuário que cadastrou a entrega, e não necessariamente o motorista que executou a alteração.

Para integração futura, cada operação relevante deve possuir uma estratégia clara de auditoria.

### 5. RLS e service role

A área do motorista atualmente possui uma autenticação própria por sessão assinada. Por isso, não devemos aplicar simplesmente políticas RLS baseadas em `auth.uid()` sem antes definir a ponte de identidade entre a sessão do motorista e a identidade do banco.

Enquanto essa arquitetura não estiver definida, as operações que usam cliente privilegiado precisam continuar com verificações explícitas de autorização no servidor.

**Regra:** nunca considerar o service role como mecanismo de autorização. Ele apenas permite executar a operação; a autorização deve ocorrer antes dela.

## Testes obrigatórios antes de integrar o aplicativo

### Identidade

- sessão válida permite acesso;
- sessão ausente bloqueia acesso;
- sessão expirada bloqueia acesso;
- token adulterado bloqueia acesso;
- motorista inativo bloqueia acesso.

### Isolamento entre motoristas

- motorista A consulta própria entrega: permitido;
- motorista A consulta entrega do motorista B: bloqueado;
- motorista A inicia entrega de B: bloqueado;
- motorista A confirma entrega de B: bloqueado;
- alterar o ID enviado pelo aplicativo não muda a identidade autenticada.

### Estados da entrega

- pendente → iniciar: permitido;
- iniciar duas vezes: segunda tentativa bloqueada;
- confirmar sem saída: bloqueado;
- pendente + saída → confirmar: permitido;
- confirmar duas vezes: segunda tentativa bloqueada;
- entregue → iniciar: bloqueado;
- entregue → confirmar novamente: bloqueado.

### Manipulação de payload

Testar tentativas de enviar pelo cliente:

```json
{
  "motoboy_id": "outro-motorista",
  "valor_pagamento": 99999,
  "status": "entregue",
  "cadastrado_por": "outro-usuario"
}
```

Esses campos não devem ser aceitos pelas operações destinadas ao motorista.

### Repetição / idempotência

O futuro aplicativo poderá repetir uma requisição por causa de rede instável. As operações precisam produzir um resultado seguro quando forem reenviadas.

Exemplo:

```text
APP → iniciar entrega
       ↓
servidor processa
       ↓
resposta perdida por falta de internet
       ↓
APP repete
       ↓
servidor não cria uma segunda saída
```

## Critérios de aceite para o futuro aplicativo

O aplicativo somente deve ser integrado quando:

- a identidade do motorista estiver vinculada de forma inequívoca à sessão;
- nenhuma operação permitir acesso cruzado entre motoristas;
- os campos administrativos estiverem protegidos;
- as transições de entrega forem controladas pelo servidor;
- anexos tiverem autorização e validação próprias;
- ações relevantes forem auditáveis;
- requisições repetidas forem tratadas com segurança;
- os testes de adulteração de ID/payload forem aprovados;
- o fluxo offline/sincronização estiver definido;
- a documentação do contrato estiver alinhada entre as duas equipes.

## Próxima etapa técnica

Depois desta auditoria, a prioridade é implementar os testes de isolamento/autorização e revisar o histórico de auditoria. Só depois disso devemos avançar para a camada de integração que será consumida pelo futuro aplicativo.
