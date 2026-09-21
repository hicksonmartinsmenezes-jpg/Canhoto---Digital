# Segurança — Canhoto Digital

O Canhoto Digital é um sistema operacional interno. Não publique credenciais, dados de clientes, comprovantes, assinaturas ou dumps em Issues, Pull Requests ou commits.

## Postura atual

- Portal Admin com e-mail + senha armazenada como hash bcrypt.
- Sessão Admin em cookie HttpOnly assinado com HMAC-SHA256.
- Área do motorista com telefone + PIN armazenado como hash scrypt.
- Sessão do motorista em cookie HttpOnly assinado.
- Server Actions administrativas validam autenticação no servidor.
- Ações do motorista derivam a identidade da sessão e validam propriedade da entrega.
- Motorista inativo é bloqueado também na leitura do painel.
- PostgreSQL publicado somente em `127.0.0.1`.
- Host público do motorista restringe rotas administrativas via `src/proxy.ts`.
- Conclusão de entrega exige foto + assinatura no fluxo do motorista.
- Entregas concluídas e registros com histórico/comprovantes são preservados contra exclusão destrutiva.
- Comprovantes ficam fora do Git, em `storage/` ou `CANHOTO_UPLOAD_DIR`.
- Backup completo reúne PostgreSQL + comprovantes e possui validação de restore no CI.

## Segredos e dados sensíveis

Nunca versione:

- `.env`, `.env.local` ou `.env.backup`;
- senhas, PINs ou tokens;
- credenciais Cloudflare;
- dumps de PostgreSQL;
- fotos e assinaturas;
- dados operacionais reais desnecessários ao código.

## Dependências

O job `security-audit` executa `npm audit --audit-level=high` em todo Pull Request.

## Relato de vulnerabilidades

Não abra uma Issue pública com detalhes exploráveis ou dados pessoais. Relate de forma privada ao mantenedor do repositório.
