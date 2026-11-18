-- Unidades de origem das entregas: Matriz e Distribuidora. Reaproveita a
-- tabela setores (colaboradores.setor_id e entregas.setor_id já existem).

begin;

insert into setores (nome)
values ('Matriz'), ('Distribuidora')
on conflict (nome) do nothing;

commit;
