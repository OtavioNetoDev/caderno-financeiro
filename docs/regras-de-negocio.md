# Regras de negócio

Regras extraídas do uso real de controle financeiro em texto livre.
Nomes e valores usados como exemplo são fictícios.

## 1. Cartão de crédito e gastos pendentes

- **RN01:** Todo gasto no cartão pertence à fatura em que será cobrado, não ao mês da compra. Compras feitas após o fechamento vão para a fatura seguinte.
- **RN02:** Gasto "pendente" é o registrado que ainda não foi pago. Entra no saldo previsto, mas não no saldo real.
- **RN03:** Compras parceladas geram uma parcela por fatura (ex.: 1/2 e 2/2), cada uma com sua própria data de cobrança.
- **RN04:** Reembolsos e devoluções reduzem o valor da fatura em que forem creditados e, quando possível, ficam vinculados à compra de origem.
- **RN05:** Conciliação: o total calculado pelo sistema é comparado com o valor da fatura. Qualquer diferença (ex.: centavos) é registrada como ajuste, na categoria "Ajustes".
- **RN06:** Compra no cartão feita para outra pessoa gera um valor a receber (ver seção de dívidas) e não conta como despesa própria.

## 2. Dívidas e empréstimos

- **RN07:** Toda dívida tem um sentido ("a receber" ou "a pagar"), valor original, saldo atual e, opcionalmente, juros.
- **RN08:** Pagamento parcial reduz o saldo e fica no histórico com data e valor. O saldo nunca fica negativo: o excedente vira crédito ou uma nova dívida no sentido oposto.
- **RN09:** Quando houver juros, o sistema mostra o saldo "sem juros" e o saldo "com juros" lado a lado.
- **RN10:** A dívida é considerada quitada quando o saldo chega a zero e permanece no histórico.
- **RN11:** Dívidas entre as mesmas pessoas em sentidos opostos podem ser compensadas (encontro de contas), com a compensação registrada.
- **RN12:** Em rateios (ex.: assinatura compartilhada), o valor cobrado pode ser menor que o devido, e o desconto concedido deve ser registrado.

## 2. Dívidas e empréstimos

- **RN07:** Toda dívida tem um sentido ("a receber" ou "a pagar"), valor original, saldo atual e, opcionalmente, juros.
- **RN08:** Pagamento parcial reduz o saldo e fica no histórico com data e valor. O saldo nunca fica negativo: o excedente vira crédito ou uma nova dívida no sentido oposto.
- **RN09:** Quando houver juros, o sistema mostra o saldo "sem juros" e o saldo "com juros" lado a lado.
- **RN10:** A dívida é considerada quitada quando o saldo chega a zero e permanece no histórico.
- **RN11:** Dívidas entre as mesmas pessoas em sentidos opostos podem ser compensadas (encontro de contas), com a compensação registrada.
- **RN12:** Em rateios (ex.: assinatura compartilhada), o valor cobrado pode ser menor que o devido, e o desconto concedido deve ser registrado.
