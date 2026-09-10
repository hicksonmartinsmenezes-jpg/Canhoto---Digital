# Segurança do motorista — guia rápido

A área do motorista deve ser tratada como uma fronteira de segurança do sistema.

## Regra principal

O aplicativo futuro nunca define a identidade do motorista. O servidor resolve a identidade pela sessão e aplica as permissões.

## Fluxo seguro

```text
Aplicativo
   ↓
requisição com ID da entrega
   ↓
sessão autenticada
   ↓
servidor resolve motorista
   ↓
servidor verifica propriedade da entrega
   ↓
regra de negócio
   ↓
banco
```

Nunca:

```text
Aplicativo → "sou o motorista X" → banco
```

## Antes da integração

1. Testar isolamento entre motoristas.
2. Testar payload adulterado.
3. Corrigir atribuição de ator no histórico.
4. Definir segurança dos anexos.
5. Definir idempotência/offline.
6. Só então expor uma interface para o aplicativo.

Veja `docs/AUDITORIA_SEGURANCA_MOTORISTA.md` e `docs/TESTES_SEGURANCA_MOTORISTA.md` para o checklist completo.
