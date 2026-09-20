# Operação — Canhoto Digital

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

## 3. Cloudflare Tunnel — recomendado

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

## 4. Backup externo no Cloudflare R2

O backup usa `pg_dump -Fc`, executado dentro do próprio container PostgreSQL, e envia o arquivo ao R2 via AWS CLI.

Instale a AWS CLI na máquina antes de usar os scripts.

Crie no R2:

- bucket dedicado, por exemplo `canhoto-digital-backups`;
- credencial/token limitado ao bucket com leitura e escrita.

Copie:

```powershell
Copy-Item ops\backup\backup.env.example ops\backup\.env.backup
notepad ops\backup\.env.backup
```

Preencha apenas localmente:

```env
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=canhoto-digital-backups
R2_RETENTION_DAYS=30
```

Nunca envie esse arquivo para o Git.

### Teste manual obrigatório

Execute primeiro:

```powershell
.\ops\backup\backup-postgres-r2.ps1
```

Confirme no Dashboard do R2 que o objeto existe em `postgres/`.

Depois teste uma restauração real:

```powershell
.\ops\backup\test-restore-r2.ps1
```

O teste cria um **novo banco**, com nome `canhoto_restore_...`, e não sobrescreve produção.

O banco de teste não é apagado automaticamente de propósito. Só remova depois de conferir a restauração.

Somente depois de backup + restore passarem registre o agendamento:

```powershell
.\ops\windows\register-backup-task.ps1
```

Por padrão o backup fica agendado diariamente às 02:30.

## 5. Checklist de reinicialização

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
10. faça um backup manual e um restore de teste após mudanças relevantes na infraestrutura.

O servidor só deve ser considerado recuperável quando o restore do backup tiver sido realmente validado.
