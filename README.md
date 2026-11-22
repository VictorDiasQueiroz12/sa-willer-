# FinTech Flow — Tesouraria SafeCash

Sistema de tesouraria para registrar entradas e saídas em reais, acompanhar o saldo e consultar o histórico de alterações. Projeto da Situação de Aprendizagem do prof. Willer Barros.

## Executar localmente

Pré-requisitos: **Node.js 22.12+** (22 ou 24 LTS), npm e Git. O SQLite é local: não é preciso executar um servidor de banco.

```bash
git clone https://github.com/VictorDiasQueiroz12/sa-willer-.git
cd sa-willer-/backend
npm ci
cp .env.example .env
node -p "require('node:crypto').randomBytes(48).toString('hex')"
```

No `backend/.env`, cole o valor gerado em `JWT_SECRET` e defina `ADMIN_PASSWORD` (ao menos 8 caracteres, com letras e números). Depois, aplique as migrações, prepare as contas e inicie a API:

```bash
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Em outro terminal, a partir da raiz `sa-willer-`:

```bash
cd frontend
npm ci
npm run dev
```

Abra <http://localhost:5173>. O Vite encaminha `/api` para <http://localhost:3333>.

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Administrador | `ADMIN_EMAIL` (`admin@fintechflow.com` no exemplo) | Sua `ADMIN_PASSWORD` |
| Operador demo (se `SEED_DEMO=true`) | `demo@fintechflow.com` | `Demo@12345` |

O seed não altera a senha de contas existentes. Use a conta demo apenas em ambiente local; deixe `SEED_DEMO=false` em outros ambientes. Também é possível criar uma conta comum pela tela de cadastro.

### Atualizar um banco da versão anterior

Pare a API e faça um backup do arquivo SQLite antes de `npm run db:deploy`. A nova migração não apaga nem reescreve registros. Se houver lançamentos ativos com o mesmo responsável, descrição, valor, tipo e data, o índice não poderá ser criado: identifique as duplicatas e corrija-as por exclusão lógica **na versão anterior** antes de aplicar a migração. Se já houve uma tentativa malsucedida, trate a migração falha no Prisma antes de tentar novamente. O frontend e a API devem ser atualizados juntos, pois o formato monetário da resposta mudou.

## Regras de negócio

- **Saldo = entradas − saídas**, incluindo apenas lançamentos ativos. A lista pode ser filtrada por período e tipo sem alterar o saldo. O painel busca novos dados após operações locais e a cada 10 segundos.
- **Busca e exportação:** encontre lançamentos pela descrição ou pela categoria, combine com os filtros e baixe o CSV do resultado inteiro, não só da página aberta.
- **Resumo mensal:** escolha um mês para ver entradas, saídas, resultado, contagem de lançamentos ativos e as cinco maiores categorias de despesa. O resumo respeita a visão selecionada e não usa os filtros da lista.
- **Centavos inteiros:** os valores de entrada são positivos; o tipo define se é entrada ou saída. O banco usa `BigInt` e a API responde com centavos em strings para não arredondar os totais.
- **Sem duplicatas ativas:** índice único parcial no SQLite por proprietário, descrição (após remover espaços nas pontas, sensível a maiúsculas), valor, tipo e data. A regra também vale ao editar ou restaurar; uma operação conflitante retorna `409`.
- **Sem exclusão física:** a exclusão marca autor e horário. A alteração e seu evento de auditoria são gravados juntos; gatilhos bloqueiam `DELETE` de transações e `UPDATE`/`DELETE` de eventos. Os logs registram usuário, horário e estado antes/depois, conforme a operação.
- **Permissões:** operadores acessam apenas os próprios lançamentos. Administradores podem alternar entre a visão individual e a consolidada, ver excluídos, restaurá-los e consultar auditoria.

## API REST

Base local: `http://localhost:3333/api`. Rotas protegidas usam `Authorization: Bearer <token>`.

| Método e rota | Acesso | Entrada / comportamento |
| --- | --- | --- |
| `GET /health` | Público | Status da API |
| `POST /auth/register` | Público | `name`, `email`, `password`; cria conta `USER` e retorna `user`/`token` (`201`) |
| `POST /auth/login` | Público | `email`, `password`; retorna `user`/`token` |
| `GET /auth/me` | Autenticado | Usuário da sessão |
| `GET /transactions` | Autenticado | Filtros: `q` (trecho da descrição ou categoria), `type`, `from`, `to` (inclusivos), `scope=all\|mine`, `includeDeleted=true\|false` (só admin), `page`, `limit` |
| `GET /transactions/balance` | Autenticado | `scope=all\|mine`; usuários comuns recebem sempre `mine` |
| `GET /transactions/monthly` | Autenticado | `month=AAAA-MM` e `scope=all\|mine`; retorna totais em centavos, `count` e `topExpenses` (até cinco categorias) |
| `GET /transactions/export` | Autenticado | Mesmos filtros da listagem, sem paginação; CSV UTF-8 separado por `;` (até 10.000 itens, senão `422`) |
| `GET /transactions/:id` | Autenticado | Detalhes do lançamento ativo acessível |
| `POST /transactions` | Autenticado | Cria lançamento (`201`) |
| `PUT /transactions/:id` | Autenticado | Substitui descrição, valor, tipo, categoria e data |
| `DELETE /transactions/:id` | Autenticado | Exclusão lógica (`204`) |
| `POST /transactions/:id/restore` | Admin | Restaura lançamento excluído |
| `GET /admin/audit` | Admin | Auditoria paginada; filtro opcional `transactionId` |
| `GET /admin/users` | Admin | Lista usuários, sem hashes de senha |
| `PATCH /admin/users/:id/role` | Admin | `{ "role": "USER" }` ou `{ "role": "ADMIN" }`; não permite editar o próprio perfil |

Exemplo de corpo para `POST` ou `PUT` de transação:

```json
{
  "description": "Pagamento de aluguel",
  "amount": "2000,00",
  "type": "EXPENSE",
  "category": "Moradia",
  "date": "2026-11-22"
}
```

`amount` aceita ponto ou vírgula decimal, até duas casas e sem separador de milhares. No formulário, pode-se digitar ou colar `10.000,00` (ou `R$ 10.000,00`): a interface formata e normaliza antes de enviar. `category` pode ser omitida ou `null`; o tipo aceita `INCOME` ou `EXPENSE`. Datas de lançamento e filtros usam `AAAA-MM-DD`. A resposta de lançamento traz `amountCents` (no exemplo, `"200000"`), não `amount`. Exemplo de resposta de saldo:

```json
{
  "incomeCents": "0",
  "expenseCents": "200000",
  "balanceCents": "-200000",
  "currency": "BRL",
  "scope": "mine"
}
```

As listas de transações e auditoria retornam `{ items, page, limit, total, totalPages }`, com `page=1` e `limit=20` por padrão (máximo 100). Erros usam `{ "error": "mensagem" }`; validação (`400`) pode incluir `details` com `field` e `message`. Códigos comuns: `401` sessão inválida, `403` perfil insuficiente, `404` registro inexistente ou inacessível, `409` conflito.

## Arquitetura e qualidade

```text
React + Vite → API REST (Express + Zod + JWT) → Serviços → Prisma + SQLite
                                                              ├── User
                                                              ├── Transaction
                                                              └── AuditLog
```

`Transaction` referencia quem criou, alterou e excluiu; `AuditLog` referencia o lançamento e o autor do evento. O índice parcial e os gatilhos estão nas migrações SQL; use `db:deploy`, não `prisma db push`, para reproduzir essa estrutura.

```bash
npm --prefix backend run db:generate
npm --prefix backend test
npm --prefix frontend test
npm --prefix frontend run build
```

A suíte de integração cria um SQLite temporário e não usa o banco de desenvolvimento. O GitHub Actions executa os testes e o build em pushes e pull requests.

- [Cronograma de sprints e roteiro de demonstração](docs/CRONOGRAMA_SPRINTS.md)
- [Justificativa da stack e limitações](docs/JUSTIFICATIVA_STACK.md)
