# PostgreSQL local — Canhoto Digital

Esta pasta substitui a infraestrutura de banco do Supabase na Issue #64.

## Arquivos

- `migrations/0001_baseline.sql`: schema PostgreSQL puro consolidado.
- As migrations antigas em `backend/supabase/` são mantidas temporariamente apenas como histórico durante a migração.

## Subir somente o PostgreSQL

Na raiz do repositório:

```powershell
Copy-Item .env.example .env
```

Edite o `.env` local e substitua `CANHOTO_POSTGRES_PASSWORD` por uma senha forte.

Depois:

```powershell
docker compose config --quiet
docker compose up -d postgres
docker compose ps
```

O banco fica disponível somente em:

```text
127.0.0.1:5433 -> container:5432
```

A porta do PostgreSQL nunca deve ser configurada no Cloudflare Tunnel.

## Aplicar a baseline

Com o container saudável:

```powershell
Get-Content -Raw backend/postgres/migrations/0001_baseline.sql |
  docker exec -i canhoto_digital_postgres psql -v ON_ERROR_STOP=1 -U canhoto_app -d canhoto_db
```

## Verificar

```powershell
docker exec canhoto_digital_postgres pg_isready -U canhoto_app -d canhoto_db
```

```powershell
docker exec canhoto_digital_postgres psql -U canhoto_app -d canhoto_db -c "\dt"
```

## Persistência

Os dados ficam no volume nomeado:

```text
canhoto_postgres_data
```

`docker compose down` não remove esse volume.

**Atenção:** `docker compose down -v` remove o volume e apaga o banco local. Não use `-v` com dados importantes sem backup confirmado.
