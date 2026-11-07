-- Proteção persistente contra tentativas repetidas de login.
-- A chave do identificador é um HMAC gerado pela aplicação; telefone/e-mail
-- nunca são gravados nesta tabela em texto puro.

BEGIN;

CREATE TABLE login_rate_limits (
  acao text NOT NULL,
  identificador_hash text NOT NULL,
  tentativas smallint NOT NULL DEFAULT 0,
  janela_iniciada_em timestamptz NOT NULL DEFAULT now(),
  bloqueado_ate timestamptz,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT login_rate_limits_pkey PRIMARY KEY (acao, identificador_hash),
  CONSTRAINT ck_login_rate_limits_acao
    CHECK (acao IN ('entrarAdmin', 'entrarColaborador', 'loginMotorista')),
  CONSTRAINT ck_login_rate_limits_hash
    CHECK (identificador_hash ~ '^[a-f0-9]{64}$'),
  CONSTRAINT ck_login_rate_limits_tentativas
    CHECK (tentativas BETWEEN 0 AND 9)
);

CREATE INDEX idx_login_rate_limits_atualizado_em
  ON login_rate_limits(atualizado_em);

CREATE OR REPLACE FUNCTION registrar_tentativa_login(
  p_acao text,
  p_identificador_hash text
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_agora timestamptz := clock_timestamp();
  v_bloqueado_ate timestamptz;
BEGIN
  INSERT INTO login_rate_limits (
    acao,
    identificador_hash,
    tentativas,
    janela_iniciada_em,
    bloqueado_ate,
    atualizado_em
  )
  VALUES (
    p_acao,
    p_identificador_hash,
    1,
    v_agora,
    NULL,
    v_agora
  )
  ON CONFLICT (acao, identificador_hash) DO UPDATE
  SET
    tentativas = CASE
      WHEN login_rate_limits.bloqueado_ate > v_agora
        THEN login_rate_limits.tentativas
      WHEN login_rate_limits.janela_iniciada_em <= v_agora - interval '15 minutes'
        THEN 1
      ELSE LEAST(login_rate_limits.tentativas + 1, 9)::smallint
    END,
    janela_iniciada_em = CASE
      WHEN login_rate_limits.bloqueado_ate > v_agora
        THEN login_rate_limits.janela_iniciada_em
      WHEN login_rate_limits.janela_iniciada_em <= v_agora - interval '15 minutes'
        THEN v_agora
      ELSE login_rate_limits.janela_iniciada_em
    END,
    bloqueado_ate = CASE
      WHEN login_rate_limits.bloqueado_ate > v_agora
        THEN login_rate_limits.bloqueado_ate
      WHEN login_rate_limits.janela_iniciada_em <= v_agora - interval '15 minutes'
        THEN NULL
      WHEN login_rate_limits.tentativas >= 8
        THEN v_agora + interval '15 minutes'
      ELSE NULL
    END,
    atualizado_em = v_agora
  RETURNING bloqueado_ate
  INTO v_bloqueado_ate;

  -- Remove registros antigos de identificadores que não voltaram a tentar.
  DELETE FROM login_rate_limits
  WHERE atualizado_em < v_agora - interval '24 hours';

  RETURN v_bloqueado_ate IS NULL OR v_bloqueado_ate <= v_agora;
END;
$$;

CREATE OR REPLACE FUNCTION limpar_tentativas_login(
  p_acao text,
  p_identificador_hash text
)
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM login_rate_limits
  WHERE acao = p_acao
    AND identificador_hash = p_identificador_hash;
$$;

COMMIT;
