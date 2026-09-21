-- Issue: acesso de login por colaborador (papel gestor_setor), escopado ao
-- setor dele. Antes só existiam 2 tipos de conta (Admin e Motorista) — o
-- papel "gestor_setor" já existia no enum papel_colaborador, mas nunca teve
-- mecanismo de login nem coluna de senha.

alter table colaboradores
  add column senha_hash text;

-- Entregas não tinham nenhum vínculo direto com setor (só com colaboradores
-- individuais via caixa_id/cadastrado_por). Pra um gestor_setor conseguir
-- ver só as entregas do setor dele, a entrega precisa carregar o setor.
alter table entregas
  add column setor_id uuid references setores(id) on delete set null;

create index idx_entregas_setor on entregas(setor_id);

-- Hoje só existe o setor "Expedição" (semeado na 0001_baseline.sql), então
-- todo o histórico de entregas já cadastrado pertence a ele por definição.
-- Se novos setores operacionais forem criados no futuro, esse backfill não
-- se aplica mais e a tela de nova entrega precisa ganhar um seletor de
-- setor explícito.
update entregas
set setor_id = (select id from setores where nome = 'Expedição' limit 1)
where setor_id is null;
