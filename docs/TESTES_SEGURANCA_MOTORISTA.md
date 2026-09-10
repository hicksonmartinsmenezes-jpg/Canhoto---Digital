# Testes de Segurança — Motorista

Este roteiro deve ser executado antes de conectar qualquer aplicativo externo à área do motorista.

## 1. Identidade

- [ ] Sem sessão: `/motorista` redireciona para `/motorista/login`.
- [ ] Sessão expirada: acesso é bloqueado.
- [ ] Token adulterado: acesso é bloqueado.
- [ ] Motorista inativo: acesso é bloqueado.

## 2. Isolamento

Considerando dois motoristas, A e B:

- [ ] A vê apenas suas entregas.
- [ ] A não vê entrega de B alterando o ID da entrega.
- [ ] A não inicia entrega de B.
- [ ] A não confirma entrega de B.
- [ ] A não consegue obter dados privados de B através da tela do motorista.

## 3. Estado

- [ ] Entrega pendente pode ser iniciada uma vez.
- [ ] Segunda tentativa de iniciar a mesma entrega é rejeitada.
- [ ] Entrega sem `hora_saida` não pode ser confirmada.
- [ ] Entrega em rota pode ser confirmada.
- [ ] Entrega já concluída não pode ser confirmada novamente.
- [ ] Entrega cancelada não aparece na lista operacional.

## 4. Payload adulterado

Tentar enviar campos administrativos junto de uma operação do motorista:

```json
{
  "motoboy_id": "outro-id",
  "valor_pagamento": 99999,
  "forma_pagamento": "dinheiro",
  "cadastrado_por": "outro-id",
  "caixa_id": "outro-id",
  "status": "entregue"
}
```

- [ ] A operação não permite assumir outro motorista.
- [ ] A operação não permite alterar valor/pagamento.
- [ ] A operação não permite alterar autor do cadastro.
- [ ] A operação não permite alterar dados de caixa.
- [ ] A operação não permite forçar mudança de status fora do fluxo permitido.

## 5. Repetição

Simular perda de resposta da rede e repetição da mesma operação.

- [ ] Repetir `iniciar` não cria uma segunda saída.
- [ ] Repetir `confirmar` não altera novamente a entrega.
- [ ] Operações concorrentes resultam em apenas uma transição válida.

## 6. Anexos

Antes de liberar anexos no aplicativo:

- [ ] somente o motorista autorizado pode anexar à própria entrega;
- [ ] entrega de outro motorista é rejeitada;
- [ ] tipo e tamanho do arquivo são validados;
- [ ] o ator da captura é registrado corretamente;
- [ ] URL/caminho do arquivo não pode ser usado para obter arquivo de outra entrega.

## Critério final

A integração somente deve avançar quando todos os testes de identidade, isolamento, estado e adulteração de payload estiverem aprovados.
