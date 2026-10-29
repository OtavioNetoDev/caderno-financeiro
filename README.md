# Caderno Financeiro

Sistema de controle financeiro pessoal, com login, para usar em vários computadores: lançamentos,
categorias, contas, transferências, cartão de crédito, investimentos (com projeção de até 100 anos),
dívidas, metas, notas, importação de documentos, exportação e restauração de backup.

Planejamento: `docs/requisitos.md`, `docs/regras-de-negocio.md` e `docs/modelo-de-dados.md`.

## Como rodar

```bash
npm install
cp .env.example .env
npm run dev
```

Preencha o `.env` (ele nunca é versionado) e abra `http://localhost:3000`.

| Variável              | Descrição                                                                        |
| --------------------- | -------------------------------------------------------------------------------- |
| `PORT`                | Porta da API (padrão 3000)                                                       |
| `MONGODB_URI`         | URI do MongoDB (por exemplo, do Atlas)                                           |
| `JWT_SECRET`          | Segredo para assinar tokens, com 32 caracteres ou mais                           |
| `JWT_EXPIRES_IN`      | Validade do token (padrão `12h`)                                                 |
| `BCRYPT_ROUNDS`       | Custo do hash de senha (padrão 12)                                               |
| `CORS_ORIGIN`         | Origens liberadas no CORS, separadas por vírgula (opcional)                      |
| `AUTH_RATE_LIMIT`     | Tentativas de login por IP a cada 15 minutos (padrão 20)                         |
| `APP_URL`             | Endereço público, usado no link de recuperação de senha                          |
| `SMTP_*`, `MAIL_FROM` | E-mail de recuperação (opcional; sem SMTP o link aparece no console do servidor) |

Para gerar um segredo: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

Outros comandos: `npm test`, `npm run lint` e `npm run seed -- seu@email.com` (recria as categorias padrão).

Para usar em outro computador: `git clone`, `npm install`, criar o `.env` com a mesma URI e o mesmo
`JWT_SECRET`, e liberar o IP dele no MongoDB Atlas (Network Access).

## Módulos

- **Visão geral:** receitas, despesas, lucro, % investido, análise e gastos por categoria e por pessoa.
- **Gráficos:** 10 análises (por mês, dia a dia, acumulado, por categoria, pessoa, conta, dia da semana e
  patrimônio) em 8 tipos de gráfico à escolha (colunas, empilhadas, barras horizontais, linhas, área,
  pizza, rosca e radar), com legenda, dica ao passar o mouse e visão em tabela. Até 6 gráficos ao mesmo
  tempo, salvos no navegador.
- **Lançamentos:** receitas, despesas, investimentos e transferências entre contas, com edição, lixeira,
  observações, status pendente e campo "com/de" uma pessoa. A lista tem busca (sem diferenciar acento
  ou maiúscula) e filtros por tipo, status e categoria, com os totais do que está filtrado.
- **Recorrentes:** assinaturas e mensalidades (Netflix, aluguel, salário). Um clique gera os
  lançamentos do mês, sem repetir os que já existem; dá para pausar, editar o valor e definir fim.
- **Contas:** saldo inicial, saldo atual, saldo previsto (com os pendentes) e patrimônio total.
- **Cartões:** compras parceladas, fatura por mês, conciliação com o valor do banco e pagamento
  (as compras entram no resumo e nas metas por categoria; o pagamento da fatura não conta duas vezes).
- **Dívidas:** valores a receber e a pagar, com pagamentos, aumentos e histórico.
- **Investimentos:** aportes, resgates e proventos, com rendimento estimado por dia, semana e mês.
- **Simulador:** projeção de 1 a 100 anos com juros compostos e aportes mensais.
- **Metas:** limite mensal por categoria, com alertas.
- **Notas:** observações por mês.
- **Cadastros:** contas e categorias (criar, renomear, arquivar e excluir).
- **Exportar:** CSV de lançamentos (protegido contra injeção de fórmulas), backup completo em JSON e
  restauração de backup com prévia antes de gravar.

## Segurança

- Senhas com bcrypt; token JWT guardado só na aba do navegador e encerrado após 15 minutos parado.
- Trocar a senha encerra as sessões anteriores.
- Recuperação de senha com código temporário de uso único (guardado como hash).
- Isolamento por usuário em todas as consultas, `helmet`, CORS fechado por padrão e limite de tentativas de login.
- Dados financeiros ficam no banco e nunca no repositório (`.env`, `data/`, `backups/` e `*.txt` estão no `.gitignore`).

## Endpoints

Todos exigem `Authorization: Bearer <token>`, exceto `/health` e `/auth/*` (menos `/auth/me`).

| Rota                                                                                                                   | Descrição                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `GET /health`                                                                                                          | Status do serviço e do banco                                                                                 |
| `POST /auth/register`, `/auth/login`                                                                                   | Cadastro e login                                                                                             |
| `POST /auth/forgot-password`, `/auth/reset-password`                                                                   | Recuperação de senha                                                                                         |
| `GET /auth/me`                                                                                                         | Dados do usuário logado                                                                                      |
| `/categories`, `/accounts`                                                                                             | CRUD de categorias e contas                                                                                  |
| `/transactions`                                                                                                        | CRUD de lançamentos, com filtros `type`, `status`, `categoryId`, `accountId`, `from`, `to`, `page` e `limit` |
| `GET /transactions/summary?month=AAAA-MM`                                                                              | Resumo do mês                                                                                                |
| `/debts`                                                                                                               | Dívidas, com `POST /debts/:id/entries` e `GET /debts/summary`                                                |
| `/investments`                                                                                                         | Investimentos, com `/entries` e `GET /investments/summary`                                                   |
| `/cards`                                                                                                               | Cartões, compras em `/charges` e faturas em `/invoices/:month` (com `PUT` e `/pay`)                          |
| `GET /budgets/status?month=AAAA-MM`, `PUT /budgets/:categoryId`                                                        | Metas por categoria                                                                                          |
| `/notes`                                                                                                               | Notas por mês                                                                                                |
| `GET /reports/monthly?end=AAAA-MM&months=6`                                                                            | Receitas, despesas, aportes e lucro mês a mês (até 24 meses)                                                 |
| `GET /reports/daily?month=AAAA-MM`                                                                                     | Movimento dia a dia do mês                                                                                   |
| `GET /reports/breakdown?month=AAAA-MM&by=category\|account\|person\|weekday&type=expense\|income\|investment&months=1` | Totais por categoria, conta, pessoa ou dia da semana                                                         |
| `/recurring`                                                                                                           | CRUD de recorrentes, com `POST /recurring/generate` (gera os lançamentos do mês)                             |
| `GET /export/transactions.csv`, `GET /export/backup.json`                                                              | Exportação                                                                                                   |
| `POST /restore` (multipart, `dryRun=true` só mostra a prévia)                                                          | Restauração de backup                                                                                        |

Valores monetários sempre em **centavos** (inteiros).

## Importador de documentos

Em **Importar**, escolha um arquivo, revise a prévia (editável) e só então confirme. Nada é salvo antes disso.

| Formato | Como é lido                                                                                 |
| ------- | ------------------------------------------------------------------------------------------- |
| `.txt`  | Anotações no formato `DIA: dd/mm/aaaa: texto                                                |     |     | texto`(com seções`MÊS DE ...`) ou linhas de extrato |
| `.csv`  | Colunas Data, Descrição e Valor (valor negativo = despesa); separador `;`, `,` ou tabulação |
| `.xlsx` | Primeira aba com dados, com as mesmas colunas                                               |
| `.docx` | Texto do documento, nos formatos acima                                                      |
| `.pdf`  | Texto selecionável (PDF escaneado ainda não é suportado)                                    |

- O sistema sugere tipo, categoria e pessoa ("com" / "de") a partir de palavras-chave. Linhas incertas (sem valor, vários valores, dívida, data fora do mês, duplicadas) vêm desmarcadas e destacadas.
- Duplicados (mesmo dia, valor, tipo e descrição) são detectados, respeitando a quantidade existente.
- Cada importação é um lote que pode ser **desfeito** (os lançamentos vão para a lixeira).
- Arquivos de até 5 MB, conferidos pelo conteúdo e processados só em memória.

Endpoints: `GET /imports/formats`, `POST /imports/preview` (multipart), `POST /imports/confirm`, `GET /imports` e `DELETE /imports/:id`.

## Roadmap

- [ ] Incluir os recorrentes no backup e na restauração
- [ ] Testes automáticos no GitHub (CI)
- [ ] Hospedagem com HTTPS e backup automático
- [ ] Cofrinhos com cota própria e regras de categorização editáveis
- [ ] Leitura de PDF escaneado (OCR)
