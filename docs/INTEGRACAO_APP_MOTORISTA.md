# Preparação para integração com o App do Motorista

## Objetivo

O Canhoto Digital **não implementa o aplicativo móvel nesta etapa**. O aplicativo/PWA será desenvolvido posteriormente por outra pessoa.

Este documento define a fronteira técnica que o aplicativo deverá respeitar para que a futura integração possa ser feita sem acoplamento desnecessário ao painel administrativo.

## Arquitetura prevista

```text
                    CANHOTO DIGITAL
                          │
                    Supabase / API
                          │
             ┌────────────┴────────────┐
             │                         │
          /admin                  App Motorista
       ambiente interno            (futuro)
             │                         │
      gestão operacional       somente entregas do
                               motorista autenticado
```

O aplicativo do motorista será um cliente separado. Ele não deve ser tratado como uma versão móvel do painel administrativo.

## Responsabilidades

### Canhoto Digital

- manter a fonte de verdade das entregas;
- autenticar e identificar o motorista;
- aplicar autorização no servidor/banco;
- disponibilizar somente os dados necessários ao aplicativo;
- registrar alterações e eventos importantes;
- manter histórico/auditoria;
- controlar anexos, assinatura, fotos e observações quando esses recursos forem integrados.

### Aplicativo futuro

- fornecer a interface móvel ao motorista;
- coletar os dados da entrega;
- solicitar ações ao Canhoto Digital;
- apresentar estados e erros de forma adequada;
- lidar com câmera, assinatura ou recursos nativos quando forem necessários.

## Regra principal de segurança

O motorista nunca deve enviar um `motoboy_id` arbitrário para decidir quem ele representa.

A identidade do motorista deve vir da sessão/autenticação. O backend deve derivar o motorista autenticado e validar a propriedade da entrega antes de qualquer leitura ou alteração.

Mesmo que o usuário altere manualmente uma requisição, ele não pode conseguir acessar ou modificar a entrega de outro motorista.

## Permissões esperadas do motorista

O aplicativo futuro poderá, conforme as regras finais do projeto:

- consultar suas próprias entregas;
- visualizar dados necessários para realizar a entrega;
- iniciar uma entrega;
- confirmar uma entrega;
- registrar assinatura do cliente;
- anexar foto;
- registrar observação;
- consultar o estado das próprias entregas.

O motorista **não** deverá:

- acessar o painel `/admin`;
- consultar outros motoristas;
- alterar entregas de terceiros;
- cadastrar colaboradores;
- alterar configurações administrativas;
- acessar relatórios administrativos;
- alterar dados de pagamento/conferência de caixa sem uma regra explícita que permita isso.

## Entidade central

A entidade de integração é `entregas`.

Campos atualmente relevantes para o futuro aplicativo incluem:

- `id` — identificador interno UUID;
- `numero` — número operacional da entrega;
- `data`;
- `cliente_nome`;
- `numero_pedido`;
- `numero_nfe`;
- `valor_pagamento`;
- `forma_pagamento`;
- `hora_saida`;
- `motoboy_id`;
- `cliente_assinou_em`;
- `status`;
- `observacoes`.

O aplicativo não deve depender de uma estrutura visual específica do painel administrativo.

## Operações futuras

A integração deverá possuir uma camada clara de servidor/API. Conceitualmente, as operações serão equivalentes a:

```text
CONSULTAR_ENTREGAS_DO_MOTORISTA
INICIAR_ENTREGA
CONFIRMAR_ENTREGA
REGISTRAR_ASSINATURA
ENVIAR_FOTO
REGISTRAR_OBSERVACAO
```

Os nomes e formatos definitivos das rotas/Server Actions serão definidos durante a implementação do aplicativo.

## Estados da entrega

O estado atual usa:

```text
pendente → entregue
       \→ cancelado
```

Além do status, `hora_saida` representa o início da rota e `cliente_assinou_em` representa a confirmação de recebimento.

A futura integração não deve criar um segundo estado independente no aplicativo. O Canhoto Digital deve continuar sendo a fonte de verdade.

## Assinatura, foto e anexos

O banco já possui a entidade `entrega_anexos`, com tipos previstos para:

- XML da NF-e;
- XML do CT-e;
- assinatura do cliente;
- foto.

O aplicativo futuro poderá enviar esses arquivos por uma interface de backend controlada. URLs ou identificadores internos devem ser retornados ao aplicativo somente quando o usuário tiver autorização para a entrega correspondente.

## QR Code / protocolo de entrega

Existe um projeto externo de protocolo de entrega que poderá servir como referência conceitual no futuro.

**Não copiar o aplicativo externo diretamente nesta etapa.**

A referência utiliza armazenamento local no navegador e QR Code para transportar informações do protocolo. No Canhoto Digital, a fonte de verdade deverá permanecer no backend/Supabase.

Se QR Code for utilizado no futuro, a preferência é por um identificador/token opaco e de uso controlado, e não por colocar no QR dados completos de cliente, pagamento ou entrega.

Não criar página pública de cliente sem requisito explícito.

## Requisitos de integração futura

Antes de começar a implementação do aplicativo, confirmar:

1. método definitivo de autenticação do motorista;
2. formato das respostas da API/Server Actions;
3. estratégia de upload de assinatura e fotos;
4. política para uso offline e sincronização;
5. comportamento em caso de tentativa duplicada;
6. política de expiração/revogação de sessão;
7. necessidade real de QR Code;
8. campos adicionais exigidos pelo protocolo de entrega;
9. política de logs e auditoria;
10. testes de autorização entre motoristas.

## Idempotência

Operações de confirmação, assinatura e envio de arquivos devem considerar repetição por falha de rede, toque duplicado ou reenvio do aplicativo.

A integração não deve assumir que uma requisição será enviada exatamente uma vez.

## Offline

O aplicativo poderá futuramente precisar funcionar com conectividade instável. Isso deve ser tratado como requisito de integração, não como motivo para transformar IndexedDB/local storage na fonte de verdade.

Se houver fila offline, o aplicativo deverá sincronizar posteriormente com o backend e o servidor deverá validar novamente a autorização e o estado da entrega.

## Separação administrativa

O aplicativo móvel não deve reutilizar o layout ou as permissões do `/admin` apenas por conveniência.

A separação deve existir em três níveis:

1. interface/rotas;
2. sessão/autenticação;
3. autorização no servidor e no banco.

Esconder botões administrativos no aplicativo não é considerado controle de segurança.

## Checklist para o futuro integrador

- [ ] Aplicativo separado do painel admin.
- [ ] Login/sessão do motorista definido.
- [ ] Identidade do motorista derivada da sessão.
- [ ] Consulta limitada às próprias entregas.
- [ ] Mutação limitada às próprias entregas.
- [ ] RLS/políticas de banco revisadas.
- [ ] Server Actions/API sem confiança em IDs enviados pelo cliente.
- [ ] Upload seguro de assinatura/fotos.
- [ ] Idempotência nas operações críticas.
- [ ] Estratégia offline definida, se necessária.
- [ ] QR Code definido somente se houver necessidade.
- [ ] Testes de isolamento entre motoristas.
- [ ] Testes de sessão expirada/revogada.
- [ ] Auditoria/histórico validada.

## Regra de ouro

> O aplicativo é apenas o cliente. O Canhoto Digital continua sendo a autoridade sobre quem pode acessar uma entrega, quais alterações são válidas e qual é o estado oficial da entrega.
