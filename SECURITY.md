# Segurança — Canhoto Digital

Ferramenta interna da Rildon Eletropeças (Aracaju/SE), sem usuários externos e sem programa público de divulgação de vulnerabilidades. Se você encontrar um problema de segurança neste repositório, avise diretamente o mantenedor em vez de abrir uma Issue pública.

## Postura atual (revisão de 10/09/2026)

- **Autenticação administrativa:** a área administrativa usa autenticação real do Supabase e as rotas administrativas estão protegidas por middleware e Server Actions.
- **Autenticação do motorista:** a área `/motorista` usa uma sessão própria, assinada no servidor, com expiração e verificação de assinatura. O identificador do motorista é derivado da sessão; não deve ser aceito como identidade confiável vindo do navegador.
- **Autorização do motorista:** as ações de iniciar e confirmar entrega passam por uma camada server-only que valida a sessão, confirma que o motorista continua ativo e verifica que a entrega pertence a ele antes da alteração. As atualizações são limitadas aos campos permitidos pelo fluxo.
- **Service role:** `SUPABASE_SERVICE_ROLE_KEY` é utilizada somente em código server-only. Ela nunca deve ser exposta a Client Components, navegador ou aplicativo móvel.
- **RLS:** as políticas atuais do banco ainda não representam a matriz final de permissões por papel. Não adicionar uma policy baseada em `auth.uid()` para motoristas enquanto a identidade customizada do motorista não tiver uma ponte explícita com o modelo de autenticação do Supabase.
- **Futura integração mobile:** o aplicativo/PWA deverá tratar o Canhoto Digital como fonte de verdade. A identidade do motorista deverá vir da credencial/sessão da integração, nunca de um `motoboyId` informado livremente pelo cliente. Operações de escrita devem ser autenticadas, autorizadas, idempotentes e auditáveis.
- **QR Code:** quando houver QR para integração, preferir um identificador/token opaco que permita resolver o protocolo no servidor, em vez de transportar no QR dados de cliente, endereço ou pagamento.
- **Dados pessoais:** o sistema pode armazenar dados de clientes e colaboradores. O tratamento deve seguir as regras internas da Rildon e a avaliação de LGPD/compliance aplicável.
- **Esteira de qualidade:** lint, typecheck, testes, build e demais verificações configuradas no CI devem passar antes de alterações de segurança serem integradas à `main`.

## Princípios obrigatórios para a futura integração

1. **Nunca confiar na identidade enviada pelo cliente.** `motoboyId`, papel e permissões devem ser derivados da sessão/credencial autenticada.
2. **Negar por padrão.** Ausência de sessão válida, motorista inativo ou entrega não pertencente ao motorista deve resultar em recusa.
3. **Menor privilégio.** O aplicativo do motorista não deve receber acesso administrativo nem a chave service role.
4. **Escritas explícitas.** O cliente só poderá alterar os campos definidos pelo contrato de integração; campos administrativos, pagamento, atribuição e auditoria não devem ser livremente editáveis.
5. **Idempotência.** Operações que possam ser repetidas por perda de conexão ou retry devem ter comportamento seguro contra duplicação.
6. **Auditoria.** Mudanças relevantes devem permitir identificar o ator real da operação, sem usar `cadastrado_por` como substituto automático da identidade de quem executou a ação.
7. **Offline com reconciliação.** O futuro aplicativo deve poder reenviar operações sem criar confirmações duplicadas ou violar o estado atual da entrega.

## Reportando um problema

Avise diretamente o mantenedor. Não abra uma Issue pública descrevendo em detalhe uma vulnerabilidade que possa expor dados ou permitir acesso indevido.
