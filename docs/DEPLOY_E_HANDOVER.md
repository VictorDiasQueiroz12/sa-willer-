# Deploy e handover — FinTech Flow

O deploy não altera os fluxos do [vídeo de demonstração](../FinTech_Flow_Apresentacao.pdf). A API usa SQLite: mantenha **uma única instância** do processo e um volume persistente. Um frontend estático por si só não hospeda a API nem o banco.

## Opção 1 — Aplicação completa com Docker Compose

Pré-requisitos: Docker com Compose, um host para o serviço, acesso ao repositório e, para acesso público, domínio e proxy HTTPS. O container aplica as migrações antes de subir, serve o React compilado e a API na mesma origem e guarda o SQLite no volume `treasury-data`.

Na raiz do repositório:

```bash
cp .env.deploy.example .env.deploy
openssl rand -hex 48
```

Cole o valor gerado em `JWT_SECRET` no `.env.deploy` (não versionado). `APP_PORT` define a porta no host; a publicação padrão é apenas em `127.0.0.1`. Para acesso público, configure o proxy HTTPS do host para encaminhar ao aplicativo. Defina `TRUST_PROXY=1` somente se houver exatamente um proxy confiável, que sobrescreva os cabeçalhos de encaminhamento, e não exponha a API diretamente nesse caso. Use `CORS_ORIGIN` com a origem HTTPS esperada caso haja um frontend separado.

```bash
docker compose --env-file .env.deploy up -d --build
docker compose --env-file .env.deploy ps
curl --fail http://127.0.0.1:3333/api/health
```

Abra `http://localhost:3333` localmente. O Swagger fica em `/api/docs/`; o contrato em `/api/openapi.json`.

Para criar o primeiro administrador, informe o e-mail e leia a senha sem eco (Bash); não use credenciais da demonstração:

```bash
export ADMIN_EMAIL='admin@seudominio.example'
read -rsp 'Senha do administrador: ' ADMIN_PASSWORD
export ADMIN_PASSWORD
docker compose --env-file .env.deploy run --rm -e ADMIN_EMAIL -e ADMIN_PASSWORD app npm run db:seed
unset ADMIN_EMAIL ADMIN_PASSWORD
```

O seed não cria a conta demo em produção nem troca a senha de uma conta existente. Não compartilhe tokens de sessão, segredos ou bancos com dados reais.

## Opção 2 — Vercel no frontend, API separada

1. Hospede a API em um servidor com **armazenamento persistente**, usando a opção 1. Confirme que `https://<api>/api/health` responde, que o HTTPS é válido e que o backend não está exposto sem o proxy.
2. Na Vercel, importe este repositório, selecione a branch `main`, configure `frontend` como **Root Directory** e escolha Node.js 22.x. O build Vite e a pasta `dist` já estão configurados em `frontend/vercel.json`.
3. Em variáveis de ambiente do projeto Vercel, defina `VITE_API_URL=https://<api>/api`. É uma URL pública, não um segredo: não coloque `JWT_SECRET` ou senhas na Vercel. Faça novo build sempre que mudar a URL.
4. No ambiente do backend, defina `CORS_ORIGIN=https://<frontend>` sem barra final e reinicie a aplicação. Valide login, criação de lançamento e atualização do saldo a partir do endereço público.

O repositório contém a configuração de publicação, mas não pressupõe projeto Vercel, conta de hospedagem ou domínio já criados.

## Checklist de entrega

| Responsável | Conferência |
| --- | --- |
| Desenvolvimento | Branch `main` com GitHub Actions verde, contrato OpenAPI sincronizado e alterações identificadas no histórico Git. |
| Operação | Segredo e credenciais fora do Git; volume persistente, HTTPS, backup e acesso de administração conferidos. |
| Equipe e avaliação | Distribuir tarefas no [quadro proposto](QUADRO_TRELLO.md), executar o [roteiro de homologação](QUALIDADE.md) e apresentar o PDF/vídeo existente. |

### Manutenção

- **Logs:** `docker compose --env-file .env.deploy logs --tail=100 app`. A rota `/api/health` verifica o processo HTTP; valide também login e busca em um teste de aceitação.
- **Backup:** pare o serviço antes de copiar o SQLite e preserve o arquivo em local privado. Por exemplo: `docker compose --env-file .env.deploy stop app`, depois `docker compose --env-file .env.deploy cp app:/app/data/treasury.db ./treasury-backup.db`. Religue com `docker compose --env-file .env.deploy start app`. Nunca use a opção `-v` ao remover o serviço se quiser manter os dados.
- **Atualização e retorno:** faça backup antes de atualizar. Registre o SHA Git implantado. Para voltar à versão anterior, confira a compatibilidade das migrações e teste a versão e o backup em um volume separado antes de qualquer troca.
- **Limites:** protótipo acadêmico. Não use para dados financeiros reais sem revisar monitoramento, recuperação, autenticação e proteção dos dados.
