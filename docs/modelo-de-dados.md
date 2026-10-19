# Modelo de dados

Banco: MongoDB. Valores monetários sempre em **centavos (inteiros)**, sem ponto flutuante (RNF06). Datas armazenadas em UTC e exibidas no fuso America/Bahia. Todo documento pertence a um usuário (`userId`), garantindo o isolamento entre contas (RF28).

## Convenções

- `_id`: ObjectId gerado pelo MongoDB.
- `userId`: dono do registro (referência a `users`).
- `createdAt` e `updatedAt`: preenchidos automaticamente.
- `deletedAt`: exclusão lógica (lixeira), conforme RNF07.

## users

| Campo | Tipo | Observação |
| --- | --- | --- |
| name | string | nome de exibição |
| email | string | único |
| passwordHash | string | bcrypt, nunca a senha |
| currency | string | padrão BRL |
| timezone | string | padrão America/Bahia |

## accounts

Carteiras e contas: dinheiro físico, Pix, carteira digital, poupança, cofrinhos.

| Campo | Tipo | Observação |
| --- | --- | --- |
| name | string | ex.: Dinheiro, Pix, Poupança |
| type | string | cash, checking, savings, wallet, reserve |
| initialBalance | number | em centavos |
| archived | boolean | oculta sem apagar o histórico |

## categories

| Campo | Tipo | Observação |
| --- | --- | --- |
| name | string | ex.: Alimentação, Educação |
| kind | string | expense, income, investment |
| color | string | usada nos gráficos |
| parentId | ObjectId | permite subcategorias (opcional) |
| isDefault | boolean | categorias padrão do sistema |

## people

Pessoas citadas nos lançamentos e nas dívidas (RF07, RN19).

| Campo | Tipo | Observação |
| --- | --- | --- |
| name | string | apelido ou nome |
| notes | string | observações livres |

## transactions

Coleção central do sistema (RF01, RF05).

| Campo | Tipo | Observação |
| --- | --- | --- |
| type | string | income, expense, transfer, investment |
| amount | number | centavos, sempre positivo |
| date | date | data do fato |
| description | string | texto livre |
| categoryId | ObjectId | referência a categories |
| accountId | ObjectId | conta de origem |
| toAccountId | ObjectId | destino, só em transferências |
| status | string | confirmed ou pending (RN02) |
| personId | ObjectId | pessoa relacionada (opcional) |
| shareMode | string | with (dividido) ou for (só para a pessoa), RN19 |
| paymentMethod | string | cash, pix, card, transfer |
| cardInvoiceId | ObjectId | fatura, quando for no cartão |
| importBatchId | ObjectId | lote de importação de origem |
| notes | string | observações (RF25) |
| deletedAt | date | exclusão lógica |

Índices sugeridos: `{ userId, date }`, `{ userId, categoryId, date }` e `{ userId, status }`.
