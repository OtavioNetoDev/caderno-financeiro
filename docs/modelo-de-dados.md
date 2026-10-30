# Modelo de dados

Banco: MongoDB. Valores monetários sempre em **centavos (inteiros)**, sem ponto flutuante (RNF06). Datas armazenadas em UTC e exibidas no fuso America/Bahia. Todo documento pertence a um usuário (`userId`), garantindo o isolamento entre contas (RF28).

## Convenções

- `_id`: ObjectId gerado pelo MongoDB.
- `userId`: dono do registro (referência a `users`).
- `createdAt` e `updatedAt`: preenchidos automaticamente.
- `deletedAt`: exclusão lógica (lixeira), conforme RNF07.

## users

| Campo        | Tipo   | Observação            |
| ------------ | ------ | --------------------- |
| name         | string | nome de exibição      |
| email        | string | único                 |
| passwordHash | string | bcrypt, nunca a senha |
| currency     | string | padrão BRL            |
| timezone     | string | padrão America/Bahia  |

## accounts

Carteiras e contas: dinheiro físico, Pix, carteira digital, poupança, cofrinhos.

| Campo          | Tipo    | Observação                               |
| -------------- | ------- | ---------------------------------------- |
| name           | string  | ex.: Dinheiro, Pix, Poupança             |
| type           | string  | cash, checking, savings, wallet, reserve |
| initialBalance | number  | em centavos                              |
| archived       | boolean | oculta sem apagar o histórico            |

## categories

| Campo     | Tipo     | Observação                       |
| --------- | -------- | -------------------------------- |
| name      | string   | ex.: Alimentação, Educação       |
| kind      | string   | expense, income, investment      |
| color     | string   | usada nos gráficos               |
| parentId  | ObjectId | permite subcategorias (opcional) |
| isDefault | boolean  | categorias padrão do sistema     |

## people

Pessoas citadas nos lançamentos e nas dívidas (RF07, RN19).

| Campo | Tipo   | Observação         |
| ----- | ------ | ------------------ |
| name  | string | apelido ou nome    |
| notes | string | observações livres |

## transactions

Coleção central do sistema (RF01, RF05).

| Campo         | Tipo     | Observação                                      |
| ------------- | -------- | ----------------------------------------------- |
| type          | string   | income, expense, transfer, investment           |
| amount        | number   | centavos, sempre positivo                       |
| date          | date     | data do fato                                    |
| description   | string   | texto livre                                     |
| categoryId    | ObjectId | referência a categories                         |
| accountId     | ObjectId | conta de origem                                 |
| toAccountId   | ObjectId | destino, só em transferências                   |
| status        | string   | confirmed ou pending (RN02)                     |
| personId      | ObjectId | pessoa relacionada (opcional)                   |
| shareMode     | string   | with (dividido) ou for (só para a pessoa), RN19 |
| paymentMethod | string   | cash, pix, card, transfer                       |
| cardInvoiceId | ObjectId | fatura, quando for no cartão                    |
| importBatchId | ObjectId | lote de importação de origem                    |
| notes         | string   | observações (RF25)                              |
| deletedAt     | date     | exclusão lógica                                 |

Índices sugeridos: `{ userId, date }`, `{ userId, categoryId, date }` e `{ userId, status }`.

## cards

| Campo      | Tipo   | Observação                  |
| ---------- | ------ | --------------------------- |
| name       | string | ex.: Cartão principal       |
| closingDay | number | dia do fechamento da fatura |
| dueDay     | number | dia do vencimento           |
| limit      | number | centavos (opcional)         |

## card_invoices

Uma fatura por cartão e mês (RF10, RF11, RN01).

| Campo           | Tipo     | Observação                      |
| --------------- | -------- | ------------------------------- |
| cardId          | ObjectId | referência a cards              |
| referenceMonth  | string   | formato AAAA-MM                 |
| calculatedTotal | number   | soma dos lançamentos vinculados |
| billedTotal     | number   | valor informado pela fatura     |
| adjustment      | number   | diferença de conciliação (RN05) |
| status          | string   | open, closed ou paid            |

## installments

Parcelas de compras no cartão (RN03).

| Campo         | Tipo     | Observação                 |
| ------------- | -------- | -------------------------- |
| transactionId | ObjectId | compra de origem           |
| number        | number   | parcela atual              |
| total         | number   | total de parcelas          |
| amount        | number   | centavos                   |
| invoiceId     | ObjectId | fatura em que será cobrada |

## investments

| Campo      | Tipo    | Observação                             |
| ---------- | ------- | -------------------------------------- |
| name       | string  | nome do ativo ou produto               |
| type       | string  | cdb, fii, fund, stock, reserve, other  |
| annualRate | number  | taxa anual estimada, usada na projeção |
| active     | boolean | encerrado permanece no histórico       |

## investment_entries

Movimentações de cada investimento (RF13, RN15 a RN17).

| Campo        | Tipo     | Observação                         |
| ------------ | -------- | ---------------------------------- |
| investmentId | ObjectId | referência a investments           |
| kind         | string   | contribution, redemption ou income |
| amount       | number   | centavos                           |
| quantity     | number   | cotas, quando existir              |
| date         | date     | data da movimentação               |

A projeção de 1 a 100 anos (RF15) **não é armazenada**: é calculada na hora a partir do valor aplicado, da taxa e do aporte mensal.

## debts

Dívidas a receber e a pagar (RF17, RN07).

| Campo          | Tipo     | Observação                                  |
| -------------- | -------- | ------------------------------------------- |
| personId       | ObjectId | com quem é a dívida                         |
| direction      | string   | receivable (a receber) ou payable (a pagar) |
| originalAmount | number   | centavos                                    |
| interestRate   | number   | opcional                                    |
| balance        | number   | saldo atual                                 |
| status         | string   | open ou settled                             |

## debt_payments

| Campo  | Tipo     | Observação         |
| ------ | -------- | ------------------ |
| debtId | ObjectId | referência a debts |
| amount | number   | centavos           |
| date   | date     | data do pagamento  |
| notes  | string   | observações        |

## reserves

Cofrinhos com cota por período (RF24, RN13, RN14).

| Campo        | Tipo     | Observação                    |
| ------------ | -------- | ----------------------------- |
| name         | string   | ex.: Lanche, Emergência       |
| categoryId   | ObjectId | categoria vinculada           |
| periodAmount | number   | cota por período, em centavos |
| balance      | number   | saldo atual                   |

## budgets

| Campo       | Tipo     | Observação           |
| ----------- | -------- | -------------------- |
| categoryId  | ObjectId | categoria controlada |
| month       | string   | AAAA-MM              |
| limitAmount | number   | centavos (RF23)      |

## notes

Bloco de notas e observações por mês (RF25).

| Campo   | Tipo   | Observação  |
| ------- | ------ | ----------- |
| month   | string | AAAA-MM     |
| title   | string | opcional    |
| content | string | texto livre |

## import_batches

Histórico de importações (RF03, RF03.3).

| Campo        | Tipo   | Observação                            |
| ------------ | ------ | ------------------------------------- |
| fileName     | string | nome original                         |
| format       | string | txt, csv, xlsx, docx, pdf, ofx, image |
| status       | string | reviewing, confirmed ou undone        |
| totalRows    | number | linhas lidas                          |
| importedRows | number | linhas confirmadas                    |

## category_rules

Regras de categorização automática (RF08).

| Campo      | Tipo     | Observação                      |
| ---------- | -------- | ------------------------------- |
| keyword    | string   | ex.: açaí                       |
| categoryId | ObjectId | categoria sugerida              |
| priority   | number   | maior vence em caso de conflito |

## Relações principais

- `transactions` pertence a `accounts`, `categories` e, opcionalmente, a `people` e `card_invoices`.
- `card_invoices` pertence a `cards` e agrupa `transactions` e `installments`.
- `investment_entries` pertence a `investments`.
- `debt_payments` pertence a `debts`, que pertence a `people`.
- `transactions` pode apontar para `import_batches`, permitindo desfazer um lote inteiro.

## Implementação atual

Diferenças entre o desenho acima e o que foi implementado:

- **Dívidas e investimentos:** as movimentações ficam dentro do próprio documento (`entries`), e não em coleções separadas. A dívida guarda pagamentos e aumentos; o investimento guarda aportes, resgates e proventos. O saldo é recalculado a cada movimentação.
- **Lançamentos:** `personName` (texto) é usado no lugar de `personId`, junto com `shareMode` ("com" ou "de").
- **Cartões:** `cards` guarda o dia de fechamento e vencimento, além das faturas conferidas (`invoices`: valor informado pelo banco, pago, valor pago). As compras ficam em `cardcharges` (com `installments`). A fatura de cada mês e as parcelas são calculadas a partir das compras e do dia de fechamento, sem coleção própria.
- **Metas:** `budgets`, com uma meta mensal por categoria e usuário.
- **Notas:** `notes`, por mês.
- **Recorrentes:** `recurring`, modelo de um lançamento mensal (descrição, valor em centavos, tipo, dia do mês, mês inicial e final, conta e categoria). Os lançamentos reais são gerados mês a mês e guardam `recurringId` e `recurringMonth`, com índice único para nunca duplicar o mesmo mês. Entram no backup e na restauração.
- **Usuários:** além de nome, e-mail e hash da senha, guardam o hash do código de recuperação (`resetTokenHash`, `resetTokenExpires`) e `passwordChangedAt`, usado para encerrar sessões antigas.
- **Importação:** `import_batches` registra cada lote importado, e os lançamentos guardam `importBatchId` para desfazer o lote inteiro.
- **Ainda não implementados:** `reserves` (cofrinhos com cota própria) e `category_rules` (regras de categorização editáveis).

Todos os valores monetários continuam em centavos (inteiros) e todos os documentos têm `userId`.
