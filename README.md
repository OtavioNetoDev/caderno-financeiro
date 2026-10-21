# Caderno Financeiro

Sistema de controle financeiro pessoal: lançamentos, categorias, contas, cartão,
investimentos (com projeção de até 100 anos), dívidas e dashboard.

Status: em desenvolvimento. Veja `docs/requisitos.md`, `docs/regras-de-negocio.md`
e `docs/modelo-de-dados.md`.

## Como rodar

```bash
npm install
cp .env.example .env
npm run dev
```

Preencha o `.env` (ele nunca é versionado):

| Variável | Descrição |
| --- | --- |
| `PORT` | Porta da API (padrão 3000) |
| `MONGODB_URI` | URI do MongoDB (por exemplo, do Atlas) |
| `JWT_SECRET` | Segredo para assinar tokens, com 32 caracteres ou mais |
| `JWT_EXPIRES_IN` | Validade do token (padrão `7d`) |
| `CORS_ORIGIN` | Origens liberadas no CORS, separadas por vírgula (opcional) |
| `AUTH_RATE_LIMIT` | Tentativas de login/cadastro por IP a cada 15 minutos (padrão 20) |

Para gerar um segredo: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

Outros comandos: `npm test`, `npm run lint` e `npm run seed -- seu@email.com` (recria categorias padrão).

## Autenticação

Cadastro e login devolvem um token JWT. As demais rotas exigem o cabeçalho
`Authorization: Bearer <token>`, e cada usuário só enxerga os próprios dados.

```bash
curl -X POST localhost:3000/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Maria","email":"maria@exemplo.com","password":"senha-forte-123"}'

curl -X POST localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"maria@exemplo.com","password":"senha-forte-123"}'

curl localhost:3000/auth/me -H "Authorization: Bearer $TOKEN"
```

Senhas são guardadas com bcrypt (nunca em texto), a senha precisa ter de 8 a 72 caracteres
e as rotas de cadastro e login têm limite de tentativas por IP.

## Endpoints

| Rota | Autenticação | Descrição |
| --- | --- | --- |
| `GET /health` | não | Status do serviço e do banco |
| `POST /auth/register` | não | Cria a conta e as categorias padrão |
| `POST /auth/login` | não | Devolve o token |
| `GET /auth/me` | sim | Dados do usuário logado |
| `/categories` | sim | CRUD de categorias |
| `/accounts` | sim | CRUD de contas e carteiras |
| `/transactions` | sim | CRUD de lançamentos, com filtros `type`, `status`, `categoryId`, `accountId`, `from`, `to`, `page` e `limit` |
| `GET /transactions/summary?month=AAAA-MM` | sim | Receitas, despesas, aportes, lucro e % investido do mês |

Valores monetários sempre em **centavos** (inteiros).
