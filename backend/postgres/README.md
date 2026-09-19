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

## Aplicar as migrations

Com o container saudável, aplique os arquivos em ordem:

```powershell
Get-ChildItem backend/postgres/migrations/*.sql |
  Sort-Object Name |
  ForEach-Object {
    Write-Host "Aplicando $($_.Name)"
    Get-Content -Raw $_.FullName |
      docker exec -i canhoto_digital_postgres psql -v ON_ERROR_STOP=1 -U canhoto_app -d canhoto_db
  }
```

Se a `0001_baseline.sql` já foi aplicada anteriormente, aplique somente as migrations novas. Não rode a baseline uma segunda vez no mesmo banco.

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
