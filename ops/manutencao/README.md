# Manutenção de dados

Scripts avulsos de correção de dados, para rodar à mão no servidor, com
backup feito e conferido antes.

| Script | O que faz |
|---|---|
| `listar-hora-saida-utc.sql` | Só lê: lista as entregas cuja hora de saída foi gravada em UTC (3 h adiantada). |
| `corrigir-hora-saida-utc.sql` | Subtrai 3 h das horas listadas acima. Pede confirmação antes de gravar. |

## Origem do problema

Até 10/11/2026 o container do Next.js rodava em UTC e a "hora de saída" era
gravada com o relógio do processo: uma saída às 09:57 ficava registrada como
12:57. O container passou a rodar em horário de Brasília (`frontend/Dockerfile`)
e, desde a versão de 18/11/2026, a hora e a data são calculadas sempre no fuso
da loja (`frontend/src/lib/fuso-loja.ts`), sem depender da configuração do
container.

As entregas gravadas antes da correção continuam com a hora adiantada. Esses
scripts tratam apenas delas.

## Como rodar

```bash
# 1) backup (obrigatório)
docker exec rildon_postgres pg_dump -U postgres -Fc canhoto_db > /root/canhoto-pre-hora-saida-$(date +%F).dump

# 2) conferir o que será mudado
docker exec -i rildon_postgres psql -U postgres -d canhoto_db -v corte="'2026-11-10'" < listar-hora-saida-utc.sql

# 3) corrigir (só depois de aprovar a lista)
docker exec -i rildon_postgres psql -U postgres -d canhoto_db -v corte="'2026-11-10'" < corrigir-hora-saida-utc.sql
```

`corte` é o último dia em que o container ainda rodava em UTC.
