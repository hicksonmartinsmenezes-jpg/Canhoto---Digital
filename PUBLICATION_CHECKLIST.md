# Preparação para publicação do repositório

Este documento existe porque o histórico privado contém um protótipo legado (`romaneio/`) que incluiu dados operacionais, credenciais antigas e comprovantes.

## Estado sanitizado

A branch recomendada como fonte para publicação é:

```text
chore/public-repo-sanitization
```

Ela remove do snapshot atual:

- `romaneio/`;
- `backend/supabase/`;
- `frontend/.env.local.example` antigo;
- documentação obsoleta do Supabase.

Também reforça o `.gitignore` para evitar reintrodução desses arquivos.

## Caminho recomendado: novo repositório público

Não torne este repositório privado atual diretamente público enquanto o histórico antigo estiver acessível.

Use o script:

```powershell
.\scripts\exportar-repositorio-publico.ps1
```

Ele cria uma pasta irmã com apenas os arquivos da branch sanitizada, sem a pasta `.git` e sem qualquer histórico anterior.

Depois:

1. revise manualmente a pasta exportada;
2. crie um novo repositório vazio no GitHub;
3. inicialize Git na pasta exportada;
4. faça o primeiro commit;
5. conecte o novo remoto;
6. publique esse novo repositório.

Exemplo, dentro da pasta exportada:

```powershell
git init
git branch -M main
git add .
git commit -m "chore: public baseline"
git remote add origin <URL_DO_NOVO_REPOSITORIO>
git push -u origin main
```

## Alternativa: preservar o mesmo repositório

Preservar a mesma URL exige reescrita de histórico com `git filter-repo`, force-push e revisão/remoção de todas as branches e tags que ainda apontem para objetos antigos.

Essa operação é destrutiva e deve ser feita somente com backup completo e janela de manutenção.

## Checklist antes de mudar a visibilidade

- [ ] nenhum `.env` real versionado;
- [ ] nenhuma credencial real em arquivos;
- [ ] nenhum dump PostgreSQL;
- [ ] nenhuma foto ou assinatura operacional;
- [ ] nenhum JSON com clientes/documentos/endereços reais;
- [ ] nenhum token Cloudflare/ngrok;
- [ ] revisão do histórico do repositório que será publicado;
- [ ] `npm audit` executado;
- [ ] CI verde;
- [ ] README e SECURITY atualizados.

## Observação sobre dados antigos

Apagar um arquivo em um commit novo não remove o arquivo dos commits anteriores. Por isso a publicação segura deve usar um histórico novo ou uma reescrita completa do histórico antigo.
