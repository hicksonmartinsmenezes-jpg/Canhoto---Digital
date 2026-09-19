# Contrato de integração — aplicativo do motorista

## Objetivo

Este documento define a fronteira entre o Canhoto Digital e o futuro aplicativo/PWA do motorista.

O aplicativo será desenvolvido separadamente. A integração deverá consumir o Canhoto como fonte de verdade e não deverá duplicar a regra de negócio principal no cliente.

## Responsabilidades

### Canhoto Digital

- autenticar e autorizar o motorista;
- determinar quais entregas pertencem ao motorista autenticado;
- manter o estado oficial da entrega;
- validar transições de estado;
- registrar auditoria;
- armazenar e proteger dados e anexos;
- impedir acesso entre motoristas;
- tratar retries e operações repetidas com segurança.

### Aplicativo/PWA

- apresentar as entregas autorizadas;
- coletar ações do motorista;
- enviar somente os dados previstos pelo contrato;
- tratar conectividade intermitente;
- reenviar operações de forma segura quando necessário;
- nunca receber ou armazenar credenciais administrativas.

## Identidade

A identidade do motorista **não pode** ser definida por um `motoboyId` enviado pelo cliente.

O servidor deverá obter a identidade a partir da credencial/sessão autenticada e, somente depois, consultar as entregas autorizadas.

Enquanto a autenticação atual baseada em cookie assinado estiver vigente, as Server Actions existentes continuam sendo a fronteira de segurança. Uma API pública/mobile deverá receber uma estratégia de autenticação própria antes de ser liberada.

## Operações mínimas previstas

### Listar entregas do motorista

Entrada: credencial autenticada.

Saída: somente entregas vinculadas ao motorista autenticado e os campos necessários para o aplicativo.

Não expor dados administrativos ou internos que não façam parte do fluxo do motorista.

### Iniciar entrega

Entrada mínima:

- `entregaId`;
- credencial autenticada.

Servidor:

1. resolve o motorista pela sessão;
2. verifica que o motorista está ativo;
3. verifica que a entrega pertence ao motorista;
4. verifica que a entrega ainda está em estado compatível;
5. grava somente os campos permitidos;
6. retorna o estado resultante.

### Confirmar entrega

Entrada mínima:

- `entregaId`;
- credencial autenticada;
- dados de confirmação que forem definidos no contrato final.

Servidor:

1. resolve o motorista pela sessão;
2. verifica a propriedade da entrega;
3. verifica que a saída foi registrada;
4. verifica que a entrega ainda não foi confirmada;
5. grava a confirmação;
6. registra a mudança de estado e o ator real;
7. retorna o estado resultante.

## Idempotência e offline

O aplicativo poderá operar com conectividade instável. Por isso, a integração final deve definir um `requestId`/idempotency key para operações de escrita.

Uma mesma operação reenviada não deve:

- criar uma segunda confirmação;
- duplicar anexos sem intenção;
- avançar uma entrega duas vezes;
- permitir uma transição inválida após outra operação já ter sido processada.

O servidor deve responder de forma determinística quando uma operação já tiver sido processada.

## Anexos e assinatura

Anexos futuros devem ser enviados por fluxo autenticado e associados a uma entrega já autorizada.

O aplicativo não deve poder escolher livremente o `motoboyId`, `capturado_por` ou outro ator de auditoria no payload.

A estratégia de armazenamento, tamanho máximo, tipos MIME permitidos e política de retenção deverá ser definida antes da implementação de upload no aplicativo.

## QR Code

Se o fluxo usar QR Code para localizar uma entrega/protocolo, o QR deve preferencialmente conter um identificador opaco ou token de curta duração.

Não colocar diretamente no QR dados como:

- nome do cliente;
- endereço;
- valor de pagamento;
- documentos fiscais;
- outros dados pessoais desnecessários.

## Segurança de transporte e credenciais

- Toda comunicação da futura integração deve ocorrer por HTTPS.
- Nenhuma chave `service_role` pode chegar ao aplicativo.
- Tokens de acesso devem possuir expiração e revogação/rotação conforme a estratégia de autenticação escolhida.
- Endpoints mobile devem aplicar rate limit e validação de payload.
- Erros externos devem ser genéricos; detalhes internos ficam em logs protegidos.

## Campos que o aplicativo não deve controlar livremente

O cliente móvel não deve definir diretamente:

- `cadastrado_por`;
- `caixa_id`;
- `caixa_confirmou_em`;
- `motoboy_id`;
- permissões/papel;
- status arbitrário;
- timestamps de auditoria;
- URLs de anexos já armazenados;
- valores de pagamento ou forma de pagamento, salvo regra explícita do contrato final.

## Critério de aceite da integração

A integração estará pronta para produção somente quando for possível demonstrar que:

- motorista A não consegue consultar entrega de motorista B;
- motorista A não consegue iniciar entrega de motorista B;
- motorista A não consegue confirmar entrega de motorista B;
- alterar IDs no payload não muda a identidade autenticada;
- sessão ausente ou expirada é recusada;
- motorista inativo é recusado;
- retries não duplicam operações;
- dados administrativos não são enviados ao aplicativo sem necessidade;
- todas as operações relevantes possuem ator auditável;
- nenhum segredo privilegiado é distribuído ao cliente.

## Regra de ouro

> O aplicativo é cliente. O Canhoto Digital é a fonte de verdade e a autoridade de autorização.
