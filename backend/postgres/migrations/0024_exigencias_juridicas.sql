-- Ajustes pedidos no parecer jurídico sobre o comprovante digital:
--  * empresa ou vínculo de quem recebeu;
--  * código de verificação guardado na conclusão (permite consultar depois);
--  * impressão digital calculada no celular, para conferir com a do servidor;
--  * trilha de auditoria e provas que não podem ser alteradas nem apagadas.
-- Entregas e anexos antigos ficam com NULL nas colunas novas.

begin;

alter table entregas
  add column if not exists recebedor_vinculo text,
  add column if not exists codigo_verificacao char(64);

alter table entregas
  drop constraint if exists ck_entregas_recebedor_vinculo_tamanho;
alter table entregas
  add constraint ck_entregas_recebedor_vinculo_tamanho
  check (recebedor_vinculo is null or char_length(recebedor_vinculo) <= 120);

alter table entregas
  drop constraint if exists ck_entregas_codigo_verificacao_formato;
alter table entregas
  add constraint ck_entregas_codigo_verificacao_formato
  check (codigo_verificacao is null or codigo_verificacao ~ '^[0-9a-f]{64}$');

create unique index if not exists uq_entregas_codigo_verificacao
  on entregas(codigo_verificacao)
  where codigo_verificacao is not null;

alter table entrega_anexos
  add column if not exists sha256_dispositivo char(64);

alter table entrega_anexos
  drop constraint if exists ck_entrega_anexos_sha256_dispositivo_formato;
alter table entrega_anexos
  add constraint ck_entrega_anexos_sha256_dispositivo_formato
  check (sha256_dispositivo is null or sha256_dispositivo ~ '^[0-9a-f]{64}$');

-- Histórico de situação: só entra linha nova; nunca muda nem some.
create or replace function bloquear_alteracao_historico()
returns trigger as $$
begin
  raise exception
    'entrega_historico é trilha de auditoria: não pode ser alterada nem apagada (%)',
    tg_op
    using errcode = 'restrict_violation';
end;
$$ language plpgsql;

drop trigger if exists trg_entrega_historico_imutavel on entrega_historico;
create trigger trg_entrega_historico_imutavel
  before update or delete on entrega_historico
  for each row execute function bloquear_alteracao_historico();

-- Anexos (fotos e documentos): nunca apagados nem trocados. A única mudança
-- aceita é preencher a impressão digital de um anexo antigo que não tinha.
create or replace function bloquear_alteracao_anexos()
returns trigger as $$
begin
  if tg_op = 'UPDATE'
     and old.sha256 is null
     and (to_jsonb(new) - 'sha256') = (to_jsonb(old) - 'sha256') then
    return new;
  end if;

  raise exception
    'entrega_anexos guarda a prova da entrega: não pode ser alterada nem apagada (%)',
    tg_op
    using errcode = 'restrict_violation';
end;
$$ language plpgsql;

drop trigger if exists trg_entrega_anexos_imutavel on entrega_anexos;
create trigger trg_entrega_anexos_imutavel
  before update or delete on entrega_anexos
  for each row execute function bloquear_alteracao_anexos();

-- Depois de concluída, a entrega não muda quem recebeu, quando foi concluída
-- nem o código de verificação (que só pode ser preenchido se estava vazio).
create or replace function bloquear_alteracao_conclusao()
returns trigger as $$
begin
  if old.cliente_assinou_em is null then
    return new;
  end if;

  if new.cliente_assinou_em is distinct from old.cliente_assinou_em
     or new.recebedor_nome is distinct from old.recebedor_nome
     or new.recebedor_vinculo is distinct from old.recebedor_vinculo
     or (old.codigo_verificacao is not null
         and new.codigo_verificacao is distinct from old.codigo_verificacao) then
    raise exception
      'os dados de conclusão da entrega % não podem ser alterados', old.id
      using errcode = 'restrict_violation';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_entregas_conclusao_imutavel on entregas;
create trigger trg_entregas_conclusao_imutavel
  before update on entregas
  for each row execute function bloquear_alteracao_conclusao();

commit;
