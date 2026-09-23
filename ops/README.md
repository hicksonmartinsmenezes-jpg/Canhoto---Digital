# Operação — Canhoto Digital

## Ambiente atual de desenvolvimento

Enquanto o projeto estiver sendo desenvolvido na estação atual, a inicialização é **manual** pelo VS Code.

O PostgreSQL não reinicia automaticamente com o Docker Desktop e o Next.js não deve ser registrado para iniciar no logon do Windows.

Fluxo manual recomendado:

```powershell
# raiz do projeto
docker compose up -d postgres

cd frontend
npm run dev
```

Para encerrar:

```powershell
# frontend: Ctrl+C
cd ..
docker compose stop postgres
```

Os scripts de auto-start em `ops/windows/` ficam preservados apenas para futura implantação em servidor dedicado.

Este diretório contém a configuração operacional da instalação na máquina Windows 11 da loja.

## 1. Aplicação

Produção usa:

```text
Next.js      0.0.0.0:3003
PostgreSQL   127.0.0.1:5433
```

A porta 5433 nunca deve ser publicada na rede externa ou no Cloudflare Tunnel.

## 2. Inicialização do Next.js

Antes de registrar a tarefa automática, valide manualmente:

```powershell
cd frontend
npm ci
npm run build
npm run start
```

Em outro PowerShell:

```powershell
Invoke-WebRequest http://127.0.0.1:3003/login -UseBasicParsing
```

Depois de confirmar que o serviço funciona:

```powershell
.\ops\windows\register-startup-task.ps1
```

O agendamento usa `AtLogOn` porque Docker Desktop é executado na sessão do usuário. Em um reboot, o usuário Windows da loja precisa iniciar sessão para o Docker Desktop e o Next.js subirem.

No Docker Desktop, deixe habilitado o início automático ao entrar no Windows.

## 3. Cloudflare Tunnel — teste sem domínio

Enquanto a empresa não possuir domínio próprio, use apenas um **Quick Tunnel temporário** para validar a área do motorista.

Pré-requisito: `cloudflared` instalado no Windows e disponível no `PATH`.

Com o Next.js de produção já rodando em `:3003`, execute na raiz:

```powershell
.\ops\cloudflare\start-quick-tunnel.ps1
```

O Cloudflare imprimirá uma URL aleatória semelhante a:

```text
https://palavras-aleatorias.trycloudflare.com
```

Teste pelo 4G/5G:

```text
https://...trycloudflare.com/motorista/login
```

O middleware reconhece automaticamente `*.trycloudflare.com` como host público e bloqueia o Portal Admin:

```text
/motorista/login  permitido
/motorista        permitido após autenticação
/                 404
/login            404
/canhotos         404
```

Quick Tunnel é somente para teste. A URL é temporária e muda quando o processo é recriado. Mantenha o PowerShell aberto durante o teste e use `Ctrl+C` para encerrar.

Se existir `%USERPROFILE%\.cloudflared\config.yml` ou `config.yaml`, o script interrompe a execução porque Quick Tunnel não é compatível com esse arquivo de configuração.

## 4. Cloudflare Tunnel — produção com domínio

Use um túnel **remotamente gerenciado** pelo Dashboard.

Pré-requisitos:

- conta Cloudflare;
- domínio adicionado à Cloudflare;
- DNS/nameservers do domínio ativos na Cloudflare.

No Dashboard:

1. Networking > Tunnels;
2. Create Tunnel;
3. nome sugerido: `canhoto-digital`;
4. selecione Windows;
5. copie o comando de instalação mostrado pelo Dashboard;
6. adicione uma rota Published application;
7. hostname sugerido: `entregas.seudominio.com.br`;
8. Service URL: `http://127.0.0.1:3003`.

No Prompt/PowerShell **como Administrador**, o comando fornecido pela Cloudflare será equivalente a:

```powershell
cloudflared.exe service install <TUNNEL_TOKEN>
```

O token é segredo. Nunca coloque o comando real com token no Git, issue, PR, log ou chat.

Depois configure em `frontend/.env.local`:

```env
PUBLIC_MOTORISTA_HOST=entregas.seudominio.com.br
```

Rebuild/reinicie o Next.js após mudar variáveis de produção.

### Proteção do Portal Admin

Quando a requisição chega pelo `PUBLIC_MOTORISTA_HOST`, o middleware só permite rotas `/motorista`.

Assim:

```text
https://entregas.seudominio.com.br/motorista       permitido
https://entregas.seudominio.com.br/motorista/login permitido
https://entregas.seudominio.com.br/                 404
https://entregas.seudominio.com.br/canhotos         404
https://entregas.seudominio.com.br/login             404
```

O Portal Admin deve ser acessado internamente pela rede da loja, por exemplo:

```text
http://IP-DA-MAQUINA:3003
```

`config.example.yml` existe apenas para o caso de optar no futuro por um túnel localmente gerenciado.

## 5. Backup completo + cópia externa sincronizada

O backup não depende de Cloudflare R2 nem de AWS CLI.

Cada exportação CSV feita pela tela de Relatórios é arquivada automaticamente em `storage/relatorios` (ou em `CANHOTO_RELATORIOS_DIR`, quando configurado).

Cada execução de backup cria um pacote atômico em:

```text
backups/canhoto/canhoto-AAAAMMDD-HHMMSS/
├── database.dump
├── uploads.zip
├── relatorios.zip
└── manifest.json
```

O pacote reúne o PostgreSQL, os comprovantes físicos e os relatórios já exportados na mesma execução. O `manifest.json` registra hashes SHA-256, quantidade de arquivos e as tabelas obrigatórias. Um backup só é promovido para a pasta final depois de passar nas validações.

Opcionalmente, o pacote completo é copiado para uma pasta sincronizada por outro serviço, como OneDrive ou Google Drive.

Crie a configuração local:

```powershell
Copy-Item ops\backup\backup.env.example ops\backup\.env.backup
notepad ops\backup\.env.backup
```

Configuração padrão:

```env
BACKUP_RETENTION_DAYS=30
BACKUP_MIRROR_DIR=
CANHOTO_RELATORIOS_DIR=
```

Enquanto `BACKUP_MIRROR_DIR` estiver vazio, o backup fica apenas na máquina local.

Exemplos de espelho externo:

```env
BACKUP_MIRROR_DIR=%OneDrive%\Canhoto Digital\Backups
```

ou:

```env
BACKUP_MIRROR_DIR=G:\Meu Drive\Canhoto Digital\Backups
```

A pasta escolhida deve pertencer a um cliente de sincronização já configurado no Windows.

### Teste manual obrigatório

Primeiro crie um backup real:

```powershell
.\ops\backup\backup-postgres.ps1
```

O script:

- verifica se todo `arquivo_url` registrado em `entrega_anexos` existe no storage;
- executa `pg_dump -Fc` dentro do container PostgreSQL;
- valida o dump com `pg_restore -l`;
- compacta `storage/uploads` (ou `CANHOTO_UPLOAD_DIR`) em `uploads.zip`;
- compacta `storage/relatorios` (ou `CANHOTO_RELATORIOS_DIR`) em `relatorios.zip`;
- calcula SHA-256 do banco, dos comprovantes e dos relatórios;
- grava o `manifest.json`;
- copia o pacote completo para `BACKUP_MIRROR_DIR` quando configurado;
- mantém a retenção configurada.

Depois faça uma restauração real em banco separado:

```powershell
.\ops\backup\test-restore.ps1
```

O teste cria um banco temporário `canhoto_restore_...`, restaura o dump, confirma as 11 tabelas essenciais, extrai `uploads.zip`, verifica se cada `arquivo_url` restaurado no banco possui o arquivo físico correspondente e também valida a quantidade de arquivos em `relatorios.zip` quando o pacote contém relatórios.

Por padrão, banco e pasta temporários são apagados após uma validação bem-sucedida ou com erro. Para mantê-los para inspeção manual:

```powershell
.\ops\backup\test-restore.ps1 -KeepTestArtifacts
```

Somente depois de backup + restore passarem registre o agendamento:

```powershell
.\ops\windows\register-backup-task.ps1
```

Por padrão o backup fica agendado diariamente às 02:30.

## 6. Checklist de reinicialização

Após toda configuração estar concluída:

1. reinicie o Windows;
2. faça login na conta operacional da loja;
3. confirme Docker Desktop iniciado;
4. confirme `canhoto_digital_postgres` como `healthy`;
5. confirme a tarefa `Canhoto Digital - Next.js` em execução;
6. confirme `http://127.0.0.1:3003`;
7. confirme o hostname público `/motorista`;
8. confirme que o hostname público retorna 404 para o Portal Admin;
9. confirme o serviço `cloudflared` como Running;
10. confirme que o backup local e a cópia sincronizada estão atualizados e faça um restore de teste após mudanças relevantes na infraestrutura.

O servidor só deve ser considerado recuperável quando o restore do backup tiver sido realmente validado.
