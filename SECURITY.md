# Segurança — Canhoto Digital

Este repositório contém o código do Canhoto Digital. Não publique credenciais, dados de clientes, comprovantes, assinaturas ou dumps de banco em Issues, Pull Requests ou commits.

## Postura atual

- Portal Admin com e-mail + senha armazenada como hash bcrypt.
- Sessão Admin em cookie HttpOnly assinado com HMAC-SHA256.
- Área do motorista com telefone + PIN armazenado como hash scrypt.
- Sessão do motorista em cookie HttpOnly assinado.
- Server Actions administrativas validam autenticação antes de acessar o banco.
- Ações do motorista derivam a identidade da sessão e validam a propriedade da entrega no servidor.
- PostgreSQL local via Docker, publicado apenas em `127.0.0.1`.
- Host público do motorista pode ser isolado por `PUBLIC_MOTORISTA_HOST`; rotas administrativas retornam 404 nesse hostname.
- Fotos e assinaturas operacionais ficam fora do Git em `storage/` ou no caminho definido por `CANHOTO_UPLOAD_DIR`.
- Segredos reais ficam apenas em arquivos locais ignorados pelo Git.

## Dados sensíveis

Nunca versione:

- arquivos `.env` reais;
- senhas, PINs ou hashes copiados de ambiente real;
- tokens Cloudflare;
- dumps de PostgreSQL;
- fotos/assinaturas de comprovantes;
- listas reais de clientes, documentos, endereços ou placas quando não forem dados fictícios de teste.

## Relato de vulnerabilidades

Não publique detalhes exploráveis ou dados sensíveis em uma Issue pública. Entre em contato de forma privada com o mantenedor do repositório para relatar uma vulnerabilidade.

## Limitações conhecidas

A aplicação ainda passa por estabilização antes de uso de produção. Entre os itens acompanhados estão endurecimento das regras de negócio, cobertura de testes e validação completa de backup/restore incluindo os arquivos de comprovantes.
