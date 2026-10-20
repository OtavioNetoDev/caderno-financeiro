# Caderno Financeiro

Sistema de controle financeiro pessoal: lançamentos, categorias,
cartão, investimentos (com projeção de até 100 anos), dívidas e dashboard.

Status: em planejamento. Veja `docs/requisitos.md`.

## Como rodar

```bash
npm install
cp .env.example .env
npm run dev
```

A API fica em `http://localhost:3000` e a rota `GET /health` confirma que está no ar.

## Como rodar

```bash
npm install
cp .env.example .env
npm run dev
```

A API fica em `http://localhost:3000` e a rota `GET /health` confirma que está no ar.

## Endpoints

| Rota | Descrição |
| --- | --- |
| `GET /health` | Status do serviço e do banco |
| `/categories` | CRUD de categorias |
| `/accounts` | CRUD de contas e carteiras |
| `/transactions` | CRUD de lançamentos, com filtros `type`, `status`, `categoryId`, `accountId`, `from`, `to`, `page` e `limit` |
| `GET /transactions/summary?month=AAAA-MM` | Receitas, despesas, aportes, lucro e % investido do mês |

Valores monetários sempre em **centavos** (inteiros).
