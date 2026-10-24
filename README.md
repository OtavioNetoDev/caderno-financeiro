# Caderno Financeiro

Sistema de controle financeiro pessoal, com login, para usar em vários computadores: lançamentos,
categorias, contas, cartão de crédito, investimentos (com projeção de até 100 anos), dívidas,
metas, notas e exportação.

Planejamento: `docs/requisitos.md`, `docs/regras-de-negocio.md` e `docs/modelo-de-dados.md`.

## Como rodar

```bash
npm install
cp .env.example .env
npm run dev
```

Preencha o `.env` (ele nunca é versionado) e abra `http://localhost:3000`.

| Variável | Descrição |
| --- | --- |
| `PORT` | Porta da API (padrão 3000) |
| `MONGODB_URI` | URI do MongoDB (por exemplo, do Atlas) |
| `JWT_SECRET` | Segredo para assinar tokens, com 32 caracteres ou mais |
| `JWT_EXPIRES_IN` | Validade do token (padrão `12h`) |
| `BCRYPT_ROUNDS` | Custo do hash de senha (padrão 12) |
| `CORS_ORIGIN` | Origens liberadas no CORS, separadas por vírgula (opcional) |
| `AUTH_RATE_LIMIT` | Tentativas de login por IP a cada 15 minutos (padrão 20) |
| `APP_URL` | Endereço público, usado no link de recuperação de senha |
| `SMTP_*`, `MAIL_FROM` | E-mail de recuperação (opcional; sem SMTP o link aparece no console do servidor) |

Para gerar um segredo: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

Outros comandos: `npm test`, `npm run lint` e `npm run seed -- seu@email.com` (recria as categorias padrão).

Para usar em outro computador: `git clone`, `npm install`, criar o `.env` com a mesma URI e o mesmo
`JWT_SECRET`, e liberar o IP dele no MongoDB Atlas (Network Access).

## Módulos

- **Visão geral:** receitas, despesas, lucro, % investido, análise e gastos por categoria e por pessoa.
- **Lançamentos:** receitas, despesas e investimentos, com edição, status pendente e campo "com/de" uma pessoa.
- **Cartões:** compras parceladas, fatura por mês, conciliação com o valor do banco e pagamento.
- **Dívidas:** valores a receber e a pagar, com pagamentos, aumentos e histórico.
- **Investimentos:** aportes, resgates e proventos, com rendimento estimado por dia, semana e mês.
- **Simulador:** projeção de 1 a 100 anos com juros compostos e aportes mensais.
- **Metas:** limite mensal por categoria, com alertas.
- **Notas:** observações por mês.
- **Cadastros e Exportar:** contas, categorias, CSV de lançamentos e backup em JSON.

## Segurança

- Senhas com bcrypt; token JWT guardado só na aba do navegador e encerrado após 15 minutos parado.
- Recuperação de senha com código temporário de uso único (guardado como hash).
- Isolamento por usuário em todas as consultas, `helmet`, CORS fechado por padrão e limite de tentativas de login.
- Dados financeiros ficam no banco e nunca no repositório (`.env`, `data/`, `backups/` e `*.txt` estão no `.gitignore`).

## Endpoints

Todos exigem `Authorization: Bearer <token>`, exceto `/health` e `/auth/*` (menos `/auth/me`).

| Rota | Descrição |
| --- | --- |
| `GET /health` | Status do serviço e do banco |
| `POST /auth/register`, `/auth/login` | Cadastro e login |
| `POST /auth/forgot-password`, `/auth/reset-password` | Recuperação de senha |
| `GET /auth/me` | Dados do usuário logado |
| `/categories`, `/accounts` | CRUD de categorias e contas |
| `/transactions` | CRUD de lançamentos, com filtros `type`, `status`, `categoryId`, `accountId`, `from`, `to`, `page` e `limit` |
| `GET /transactions/summary?month=AAAA-MM` | Resumo do mês |
| `/debts` | Dívidas, com `POST /debts/:id/entries` e `GET /debts/summary` |
| `/investments` | Investimentos, com `/entries` e `GET /investments/summary` |
| `/cards` | Cartões, compras em `/charges` e faturas em `/invoices/:month` (com `PUT` e `/pay`) |
| `GET /budgets/status?month=AAAA-MM`, `PUT /budgets/:categoryId` | Metas por categoria |
| `/notes` | Notas por mês |
| `GET /export/transactions.csv`, `GET /export/backup.json` | Exportação |

Valores monetários sempre em **centavos** (inteiros).

## Roadmap

Importador de documentos (txt, planilha, docx e pdf), restauração de backup pela tela,
gastos de cartão por categoria no resumo mensal e encerramento de sessões após troca de senha.
