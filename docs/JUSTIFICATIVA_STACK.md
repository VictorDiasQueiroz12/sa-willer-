# Justificativa da Stack — JavaScript Fullstack para a SafeCash

## Requisitos que guiaram a escolha

1. Solução **multiplataforma** (web e mobile responsivo) para pequenas empresas.
2. **Integridade e rastreabilidade** dos dados financeiros.
3. **Agilidade** de entrega por uma equipe pequena (startup).
4. Facilidade de **contratação e evolução**: o ecossistema é amplamente usado por empresas de tecnologia da grande Florianópolis.

## Por que JavaScript (Node.js + React)

| Necessidade | Como a stack atende |
|---|---|
| Multiplataforma | O React gera uma interface responsiva que roda em qualquer navegador; a API REST em JSON pode ser consumida depois por app mobile (React Native) sem alterar o backend. |
| Uma linguagem só | Frontend e backend em JavaScript reduzem a troca de contexto, permitem compartilhar regras (ex.: formato de valor e datas) e facilitam o revezamento de tarefas na equipe. |
| Agilidade | Ecossistema npm maduro (Express, Prisma, Zod, JWT) permite entregar autenticação, validação e persistência rapidamente. |
| Concorrência e I/O | O Node.js trata muitas requisições simultâneas de I/O (consultas ao banco, chamadas HTTP) com baixo consumo de recursos, perfil típico de uma API de CRUD. |
| Segurança e integridade | Zod valida cada entrada na fronteira da API; Prisma usa consultas parametrizadas (previne SQL Injection); JWT + bcrypt cobrem autenticação e autorização por perfil. |
| Evolução | Prisma permite trocar SQLite por PostgreSQL/MySQL alterando o provider, sem reescrever consultas. |

## Decisões técnicas relacionadas às regras de negócio

- **Valores em centavos inteiros (BigInt):** o tipo `Number` do JavaScript é ponto flutuante (`0.1 + 0.2 ≠ 0.3`). Guardar centavos elimina erros de arredondamento.
- **Soft delete + AuditLog:** atendem a Regra de Ouro (nenhuma exclusão física) e dão rastreabilidade de quem fez o quê e quando.
- **Camadas (rotas → validação → serviços → banco):** separam responsabilidades e facilitam testes e manutenção (Clean Code).
- **Operação e auditoria na mesma transação de banco:** impedem inconsistência entre o dado e seu histórico.

## Limitações reconhecidas

- JavaScript é dinamicamente tipado; a mitigação é a validação de esquemas em runtime (Zod). Migrar para TypeScript é a evolução natural do projeto.
- Node.js não é ideal para processamento CPU-intensivo; caso a SafeCash precise de cálculos pesados (ex.: motores de risco), esses módulos podem virar serviços separados.
