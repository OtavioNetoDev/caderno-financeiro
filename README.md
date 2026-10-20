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

## Como foi feito

Projeto desenvolvido por Otávio Neto para planejamento,
revisão e geração de partes do código. Cada etapa é testada e adaptada por mim antes do commit.

## Endpoints

| Rota | Descrição |
| --- | --- |
| `GET /health` | Status do serviço e do banco |
| `/categories` | CRUD de categorias |
| `/accounts` | CRUD de contas e carteiras |
| `/transactions` | CRUD de lançamentos, com filtros `type`, `status`, `categoryId`, `accountId`, `from`, `to`, `page` e `limit` |
| `GET /transactions/summary?month=AAAA-MM` | Receitas, despesas, aportes, lucro e % investido do mês |

Valores monetários sempre em **centavos** (inteiros).

## Como foi feito

Projeto desenvolvido por Otávio Neto com auxílio do Claude (Anthropic) para planejamento,
revisão e geração de partes do código. Cada etapa é testada e adaptada por mim antes do commit.

## Como foi feito

Projeto desenvolvido por Otávio Neto para planejamento,
revisão e geração de partes do código. Cada etapa é testada e adaptada por mim antes do commit.
