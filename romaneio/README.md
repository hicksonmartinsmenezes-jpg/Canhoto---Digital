# Romaneio — protótipo de interface

Esta pasta permanece apenas como referência visual e de fluxo do protótipo criado em setembro de 2026.

## Importante

O código seguro e suportado do aplicativo do motorista vive em `frontend/src/app/motorista`.

O projeto principal já possui:

- autenticação por telefone + PIN;
- PIN armazenado com hash (scrypt), nunca em texto puro;
- sessão assinada em cookie HttpOnly;
- validação do motorista ativo no servidor;
- autorização por entrega, garantindo que o motorista só altere entregas vinculadas a ele;
- persistência no Supabase.

Por segurança, este diretório não deve conter:

- credenciais;
- arquivos JSON com usuários ou entregas reais;
- fotos de comprovantes;
- assinaturas;
- endpoints PHP paralelos à autenticação principal;
- URLs privadas/túneis locais fixos.

O `index.html` deve ser tratado somente como referência de UX/UI durante a migração dos melhores elementos visuais para o app Next.js em `/motorista`.
