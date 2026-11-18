-- Subtrai 3 h da hora de saída gravada em UTC. Rodar só depois de conferir a
-- lista de listar-hora-saida-utc.sql e com backup feito.
-- Uso: psql -v corte="'2026-11-10'" -f corrigir-hora-saida-utc.sql
\if :{?corte}
\else
  \echo 'Informe o dia de corte: psql -v corte="''2026-11-10''" -f ...'
  \quit
\endif

\set ON_ERROR_STOP on
BEGIN;

-- Guarda o antes/depois para conferência e para desfazer, se preciso.
CREATE TABLE IF NOT EXISTS correcao_hora_saida_utc (
  entrega_id uuid PRIMARY KEY,
  numero integer NOT NULL,
  data date NOT NULL,
  hora_antiga time NOT NULL,
  hora_nova time NOT NULL,
  corrigido_em timestamptz NOT NULL DEFAULT now()
);

INSERT INTO correcao_hora_saida_utc (entrega_id, numero, data, hora_antiga, hora_nova)
SELECT id, numero, data, hora_saida, (hora_saida - interval '3 hours')::time
FROM entregas
WHERE hora_saida IS NOT NULL
  AND data <= :corte
  -- Abaixo de 03:00 a subtração cairia no dia anterior: fica de fora.
  AND hora_saida >= time '03:00'
ON CONFLICT (entrega_id) DO NOTHING;

UPDATE entregas e
SET hora_saida = c.hora_nova
FROM correcao_hora_saida_utc c
WHERE c.entrega_id = e.id
  AND e.hora_saida = c.hora_antiga;

SELECT count(*) AS corrigidas FROM correcao_hora_saida_utc;

COMMIT;
