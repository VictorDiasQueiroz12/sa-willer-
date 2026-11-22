# Requisitos e critérios de aceite — FinTech Flow

**Escopo:** protótipo acadêmico de tesouraria da SafeCash. O [vídeo existente](../FinTech_Flow_Apresentacao.pdf) permanece válido: a entrega não adiciona nem remove fluxos de negócio.

## Requisitos funcionais

| ID | Requisito | Critério de aceite |
| --- | --- | --- |
| RF01 | Cadastrar e autenticar usuários | Cadastro público cria somente `USER`. Login válido abre a tesouraria; credenciais inválidas não criam sessão. |
| RF02 | Listar e cadastrar lançamentos | Operador lista apenas os próprios lançamentos. Um valor positivo e uma data válida são aceitos; valor negativo, data inválida e duplicata ativa são rejeitados. |
| RF03 | Editar e excluir logicamente | Alteração aparece na lista e no saldo. Exclusão remove o item da lista padrão sem apagar o registro. |
| RF04 | Auditar e restaurar | Administrador pode exibir excluídos, restaurar se não houver duplicata e consultar autor, horário e estados antes/depois. |
| RF05 | Acompanhar saldo | Entradas menos saídas, em centavos exatos; excluídos não entram no total. Após edição, cadastro, exclusão ou restauração, a interface busca o novo saldo. |
| RF06 | Consultar, filtrar e exportar | Busca e filtros podem ser combinados; a lista é paginada e o CSV contém todos os resultados do recorte permitido, não só a página. |
| RF07 | Visualizar resumo mensal | Escolher um mês mostra entradas, saídas, resultado e até cinco categorias de despesa. Excluídos não fazem parte do resumo. |

## Requisitos não funcionais

| ID | Requisito | Verificação |
| --- | --- | --- |
| RNF01 | Integridade monetária e rastreabilidade | Banco e saldos usam centavos inteiros; gravação e auditoria são atômicas; índice e gatilhos protegem duplicidade e exclusão física. |
| RNF02 | Segurança e RBAC | JWT assinado e com expiração, hashing bcrypt, limite de tentativas, esquemas Zod e controle de acesso no servidor. Sem senhas reais ou segredos no Git. |
| RNF03 | Responsividade e feedback | Navegação por teclado, rótulos visíveis, alerta de validação, notificação de sucesso, modal de erro de operação e estados de carregamento. Formulário sem transbordamento horizontal a 320 px no Chromium. |
| RNF04 | Desempenho verificável | Consultas listadas ou agregadas são medidas em SQLite com dados sintéticos; resultados e plano de consulta podem ser reproduzidos conforme [Qualidade](QUALIDADE.md). |
| RNF05 | Manutenibilidade e entrega | Instalação reproduzível, versão Node LTS documentada, contrato OpenAPI, testes e build no GitHub Actions e instruções de deploy. |

## Matriz de permissões

| Ação | Público | `USER` | `ADMIN` |
| --- | --- | --- | --- |
| Cadastrar conta comum ou fazer login | Sim | Sim | Sim |
| Listar, criar, editar, excluir, buscar e exportar | Não | Próprios registros | Visão própria ou consolidada; criação em nome próprio |
| Ler saldo e resumo mensal | Não | Próprios registros | Visão própria ou consolidada |
| Incluir excluídos, restaurar e consultar auditoria | Não | Não | Sim |
| Consultar contas e alterar perfil de outra conta | Não | Não | Sim, pela API |

Sem token válido, a API retorna `401`. Rotas administrativas sem perfil retornam `403`. Para um operador, um identificador de lançamento de outra conta retorna `404`, como um identificador inexistente. Acesso em navegador a Swagger/saúde não concede acesso a dados.
