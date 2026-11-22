# Qualidade, homologação e desempenho

## Estratégia de testes

| Nível | Ferramenta | Cobertura |
| --- | --- | --- |
| Unitário | Node `--test` | Conversão e formatação BRL sem arredondamento; data local do formulário. |
| Integração | Node `--test`, HTTP e SQLite temporário | Schemas, RBAC, saldo, auditoria e exclusão lógica; concorrência com lançamentos iguais e distintos; busca, CSV e relatório. |
| E2E | Playwright / Chromium, React compilado e API real | Login e navegação, valor no formulário, CRUD, busca, exportação por download, resumo mensal, restauração, auditoria, responsividade e Swagger. |
| Empacotamento | GitHub Actions | Build de produção, construção da imagem e teste HTTP de página inicial, saúde e OpenAPI. |

Para reproduzir a partir da raiz, depois de instalar dependências de `backend` e `frontend` com `npm ci`:

```bash
npm --prefix backend run db:generate
npm --prefix backend test
npm --prefix frontend test
cd frontend
npx playwright install chromium
npm run test:e2e
```

Os bancos de integração e E2E são temporários e não alteram dados de desenvolvimento. O relatório de erro do Playwright pode incluir uma gravação de rastreamento do navegador (`test-results`), disponível como artefato do CI em falhas.

## Roteiro de homologação

1. Em desktop e em viewport de 320 px, abrir o login e a tesouraria, navegar com `Tab` e conferir rótulos, foco e bordas dos campos.
2. Como operador, cadastrar e editar uma saída. Conferir formatação em reais, saldo, notificação de sucesso e comportamento para valor inválido.
3. Aplicar filtros, exportar o CSV e abrir o resumo mensal; conferir título da aba, período e categoria.
4. Excluir logicamente e sair. Como administrador, mostrar excluídos, restaurar e verificar os estados anterior/posterior na auditoria.
5. Conferir que erros de formulário não apagam os valores digitados; em falha de uma ação do painel, fechar o modal pelo botão ou `Esc`.

O E2E cobre os caminhos principais e a largura mínima em Chromium. A checagem manual por teclado e outras combinações de navegador fazem parte da homologação da equipe; o roteiro não afirma certificação de acessibilidade.

## Consultas e métricas

O SQLite mantém índices por proprietário/exclusão, data, transação de auditoria e identidade ativa. A listagem pagina no banco; o resumo agrega no banco; o CSV limita a 10.000 linhas por resposta. A API usa uma conexão SQLite para evitar disputa interna entre transações que gravam o lançamento e a auditoria. Esse desenho é para **uma instância** da API.

No frontend, a listagem só é requisitada na aba de transações. O componente de saldo é memoizado e mantém a mesma referência quando o polling retorna totais idênticos, evitando renderizações e anúncios de saldo repetidos.

```bash
npm --prefix backend run benchmark
# Carga opcional, entre 1.000 e 100.000 linhas (Bash):
BENCH_ROWS=20000 npm --prefix backend run benchmark
```

O benchmark usa um SQLite temporário com lançamentos sintéticos, aquece cada consulta e reporta mediana e p95 de 40 amostras da camada de serviços. Mede listagem, busca/período e agregação mensal, além de mostrar um `EXPLAIN QUERY PLAN` representativo. Não mede rede, múltiplos processos nem latência do navegador. Busca por trecho e ordenação podem exigir varredura ou ordenação temporária; valide com volume real antes de criar novos índices. Como referência inicial de investigação (não SLA), revise o plano se o p95 local exceder 100 ms com 10.000 itens.

Uma execução local com Node 22 e 10.000 itens registrou **p95 de 5,00 ms** na listagem, **8,47 ms** com busca e período e **6,86 ms** no resumo mensal. O plano de listagem usou o índice de proprietário/exclusão e ordenação temporária. Estes números são referência, não garantia de produção.
