-- Auditoria correta das mudanças de status da entrega.
--
-- O schema inicial gravava `new.cadastrado_por` em toda mudança de status,
-- o que atribuia a ação a quem criou a entrega, não necessariamente a quem
-- realmente alterou o status. A área do motorista agravou esse problema:
-- motoboys não são colaboradores e, portanto, nem cabem na FK antiga.
--
-- Mantemos `alterado_por` para colaboradores e adicionamos referências
-- explícitas para motorista e usuário Supabase do Portal Admin. O trigger
-- recebe o ator por contexto transacional definido pelas RPCs abaixo.
-- Quando uma mudança de status ocorrer fora desses fluxos, o ator fica nulo
-- em vez de registrar uma pessoa incorreta.

alter table entrega_historico
  add column if not exists alterado_por_motoboy uuid references motoboys(id) on delete set null,
  add column if not exists alterado_por_auth_user uuid references auth.users(id) on delete set null;

create index if not exists idx_entrega_historico_motoboy
  on entrega_historico(alterado_por_motoboy);

create index if not exists idx_entrega_historico_auth_user
  on entrega_historico(alterado_por_auth_user);

create or replace function fn_registrar_historico_entrega()
returns trigger as $$
declare
  v_colaborador_id uuid;
  v_motoboy_id uuid;
  v_auth_user_id uuid;
begin
  new.atualizado_em := now();

  if (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    v_colaborador_id := nullif(current_setting('app.entrega_colaborador_id', true), '')::uuid;
    v_motoboy_id := nullif(current_setting('app.entrega_motoboy_id', true), '')::uuid;
    v_auth_user_id := nullif(current_setting('app.entrega_auth_user_id', true), '')::uuid;

    insert into entrega_historico (
      entrega_id,
      status_anterior,
      status_novo,
      alterado_por,
      alterado_por_motoboy,
      alterado_por_auth_user
    )
    values (
      new.id,
      old.status,
      new.status,
      v_colaborador_id,
      v_motoboy_id,
      v_auth_user_id
    );
  end if;

  return new;
end;
$$ language plpgsql;

-- Confirmação controlada pelo motorista.
-- Repete ownership + estado no próprio banco, mesmo que a Server Action já
-- tenha validado isso, para que o futuro app não dependa só da camada HTTP.
create or replace function confirmar_entrega_motorista(
  p_entrega_id uuid,
  p_motoboy_id uuid,
  p_confirmado_em timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entrega_id uuid;
begin
  perform set_config('app.entrega_colaborador_id', '', true);
  perform set_config('app.entrega_auth_user_id', '', true);
  perform set_config('app.entrega_motoboy_id', p_motoboy_id::text, true);

  update entregas
  set
    cliente_assinou_em = p_confirmado_em,
    status = 'entregue'
  where id = p_entrega_id
    and motoboy_id = p_motoboy_id
    and status = 'pendente'
    and hora_saida is not null
  returning id into v_entrega_id;

  return v_entrega_id;
end;
$$;

-- Edição administrativa atômica. Além de evitar uma atualização parcial
-- entre os campos e o status, injeta o usuário real no contexto do trigger.
create or replace function atualizar_entrega_admin(
  p_entrega_id uuid,
  p_data date,
  p_cliente_nome text,
  p_cliente_telefone text,
  p_endereco text,
  p_numero_pedido text,
  p_numero_nfe text,
  p_valor_pagamento numeric,
  p_forma_pagamento forma_pagamento,
  p_motoboy_id uuid,
  p_observacoes text,
  p_status status_entrega,
  p_auth_user_id uuid,
  p_colaborador_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entrega_id uuid;
begin
  perform set_config('app.entrega_motoboy_id', '', true);
  perform set_config(
    'app.entrega_colaborador_id',
    coalesce(p_colaborador_id::text, ''),
    true
  );
  perform set_config('app.entrega_auth_user_id', p_auth_user_id::text, true);

  update entregas
  set
    data = p_data,
    cliente_nome = p_cliente_nome,
    cliente_telefone = p_cliente_telefone,
    endereco = p_endereco,
    numero_pedido = p_numero_pedido,
    numero_nfe = p_numero_nfe,
    valor_pagamento = p_valor_pagamento,
    forma_pagamento = p_forma_pagamento,
    motoboy_id = p_motoboy_id,
    observacoes = p_observacoes,
    status = p_status
  where id = p_entrega_id
  returning id into v_entrega_id;

  return v_entrega_id;
end;
$$;

-- As RPCs usam service-role no servidor. Não expor mutações privilegiadas
-- diretamente para anon/authenticated (especialmente pensando no futuro app).
revoke all on function confirmar_entrega_motorista(uuid, uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function confirmar_entrega_motorista(uuid, uuid, timestamptz)
  to service_role;

revoke all on function atualizar_entrega_admin(
  uuid, date, text, text, text, text, text, numeric,
  forma_pagamento, uuid, text, status_entrega, uuid, uuid
) from public, anon, authenticated;
grant execute on function atualizar_entrega_admin(
  uuid, date, text, text, text, text, text, numeric,
  forma_pagamento, uuid, text, status_entrega, uuid, uuid
) to service_role;
