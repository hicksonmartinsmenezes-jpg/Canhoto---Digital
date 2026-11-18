-- Só leitura: entregas cuja hora de saída foi gravada em UTC (3 h adiantada).
-- Uso: psql -v corte="'2026-11-10'" -f listar-hora-saida-utc.sql
\if :{?corte}
\else
  \echo 'Informe o dia de corte: psql -v corte="''2026-11-10''" -f ...'
  \quit
\endif

\echo '== Resumo =='
SELECT
  count(*) AS entregas_afetadas,
  min(data) AS primeira_data,
  max(data) AS ultima_data,
  count(*) FILTER (WHERE hora_saida < time '03:00') AS antes_das_03h_conferir_a_mao
FROM entregas
WHERE hora_saida IS NOT NULL
  AND data <= :corte;

\echo '== Entregas, da mais recente para a mais antiga =='
SELECT
  numero,
  data,
  hora_saida AS hora_gravada,
  hora_saida - interval '3 hours' AS hora_corrigida,
  cliente_nome,
  status
FROM entregas
WHERE hora_saida IS NOT NULL
  AND data <= :corte
ORDER BY data DESC, numero DESC;
