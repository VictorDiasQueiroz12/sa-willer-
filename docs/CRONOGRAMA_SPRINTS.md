# Cronograma de Sprints — FinTech Flow

Use o [modelo de cartões e evidências para o Trello](QUADRO_TRELLO.md) (colunas: *Backlog · Em andamento · Em revisão · Concluído*). Ajuste as datas ao calendário da turma; cada sprint sugerida tem 1 semana.

| Sprint | Objetivo | Tarefas | Evidência (Habilidade) |
|---|---|---|---|
| **0 — Planejamento** | Alinhar equipe e ambiente | Criar repositório e branches; definir padrão de commits; montar quadro de tarefas; escrever justificativa de stack | H2, H3, H4, H8 |
| **1 — Base do backend** | API no ar com banco | Configurar Express e Prisma; modelar `User`, `Transaction`, `AuditLog`; criar migration e seed | H5, H6 |
| **2 — CRUD e regras** | Regras de negócio da API | Rotas listar/criar/editar; **soft delete**; schemas Zod (valor positivo); bloqueio de duplicidade; endpoint de saldo | H1, H5 |
| **3 — Segurança (JWT)** | Autenticação e perfis | Cadastro/login com bcrypt; middleware `authenticate`/`authorize`; escopo por usuário; rotas admin; rate limit | H5, C10 |
| **4 — Frontend** | Interface administrativa | Login; dashboard com saldo; formulário de lançamento; lista com editar/excluir; filtros; tela de auditoria (admin) | H5 |
| **5 — Qualidade e entrega** | Documentar e demonstrar | Testes de integração e concorrência; CI no GitHub Actions; README com rotas; revisão em PR; ensaio da apresentação | H6, H10, C10 |

## Definição de pronto (DoD)

- Código revisado por outro membro via Pull Request.
- Nomes claros, funções pequenas e indentação consistente.
- Rota documentada no README.
- Testado manualmente (ou com teste automatizado) nos casos de sucesso e erro.

## Roteiro de demonstração (5 min)

1. Login como `USER` e cadastro de "Pagamento de Aluguel — R$ 2.000,00": o saldo atualiza.
2. Tentativa de valor negativo e de lançamento duplicado: a API rejeita.
3. Exclusão da transação: some da lista, saldo recalcula, registro permanece no banco.
4. Login como `ADMIN`: alterne entre a visão consolidada e individual, exiba os excluídos, restaure o registro e abra os detalhes na auditoria.
5. Mostrar o quadro de sprints e o histórico de commits/PRs.
