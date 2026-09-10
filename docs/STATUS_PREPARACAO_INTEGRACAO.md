# Status — Preparação para integração com App do Motorista

## Escopo desta fase

Esta fase prepara o Canhoto Digital para uma futura integração com um aplicativo/PWA desenvolvido por outra pessoa.

### Não faz parte desta fase

- desenvolver o PWA;
- desenvolver aplicativo Android/iOS;
- implementar câmera ou assinatura nativa;
- integrar diretamente o repositório externo de protocolo;
- criar página pública para cliente;
- duplicar o banco de dados no aplicativo.

### Faz parte desta fase

- organizar a fronteira `/motorista`;
- preparar autenticação e autorização do motorista;
- revisar acesso aos dados;
- definir contrato de integração;
- documentar dados e operações esperadas;
- preparar testes de segurança;
- manter o desenvolvimento isolado de `main` até revisão.

## Estado atual

Já existe uma área `/motorista` no Canhoto Digital, com login próprio e ações para iniciar e confirmar entregas. A página busca as entregas do motorista identificado pela sessão. fileciteturn133file0

As ações de iniciar/confirmar também derivam o `motoboyId` da sessão e filtram a entrega por esse identificador, evitando que um ID arbitrário enviado pelo cliente seja suficiente para alterar outra entrega. fileciteturn135file0

## Ponto de atenção

A implementação atual das ações usa um cliente administrativo do Supabase no servidor. Isso mantém a validação no servidor, mas a próxima etapa de segurança deve revisar a utilização de `service_role` e as políticas RLS para que o modelo de autorização fique robusto também no banco.

O schema atual deixa explícito que as políticas RLS ainda são provisórias: usuários autenticados conseguem ler várias entidades e as políticas de escrita por papel ainda precisam ser definidas. fileciteturn134file0

## Ordem recomendada

1. Definir o modelo de identidade do motorista.
2. Fechar regras de autorização e RLS.
3. Revisar operações de leitura/escrita do motorista.
4. Corrigir auditoria do ator que executou alterações.
5. Criar testes de isolamento entre motoristas.
6. Validar anexos/assinatura/fotos.
7. Finalizar o contrato de integração.
8. Entregar a documentação ao desenvolvedor do aplicativo.
9. Só então iniciar a integração real.

## Branch

Trabalho de preparação isolado em:

`docs/preparacao-integracao-app`

A branch parte da preparação anterior `feature/app-motorista-protocolo` e não deve ser mesclada em `main` automaticamente.
