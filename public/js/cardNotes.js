(function () {
  const MONTHS = [
    'janeiro',
    'fevereiro',
    'março',
    'abril',
    'maio',
    'junho',
    'julho',
    'agosto',
    'setembro',
    'outubro',
    'novembro',
    'dezembro',
  ];
  const two = (value) => String(value).padStart(2, '0');

  function addMonths(month, delta) {
    const [year, mon] = month.split('-').map(Number);
    const index = year * 12 + (mon - 1) + delta;
    return Math.floor(index / 12) + '-' + two((index % 12) + 1);
  }

  const daysIn = (month) => {
    const [year, mon] = month.split('-').map(Number);
    return new Date(Date.UTC(year, mon, 0)).getUTCDate();
  };

  // "setembro" (ou "janeiro de 2027" quando o ano é diferente do de referência).
  function monthLabel(month, baseYear) {
    const [year, mon] = month.split('-').map(Number);
    return MONTHS[mon - 1] + (year !== baseYear ? ' de ' + year : '');
  }

  // Dia do fechamento/vencimento dentro de um mês (dia 31 vira o último dia de meses curtos).
  const dayOf = (month, day) => two(Math.min(day, daysIn(month))) + '/' + month.slice(5, 7);

  // Explica uma compra: em que mês foi feita, quando a fatura fecha e vence e em qual mês conta como gasto.
  // Regra do sistema: a compra até o dia do fechamento entra na fatura que fecha naquele mês;
  // depois do fechamento, entra na fatura do mês seguinte. Cada parcela cai um mês depois da anterior.
  function describePurchase({ purchaseDate, closingDay, dueDay, number = 1, of = 1 }) {
    const date = new Date(purchaseDate);
    const purchaseMonth = date.getUTCFullYear() + '-' + two(date.getUTCMonth() + 1);
    const purchaseLabel = two(date.getUTCDate()) + '/' + two(date.getUTCMonth() + 1);
    const first = date.getUTCDate() <= closingDay ? purchaseMonth : addMonths(purchaseMonth, 1);
    const referenceMonth = addMonths(first, number - 1);
    const dueMonth = dueDay > closingDay ? referenceMonth : addMonths(referenceMonth, 1);
    const year = date.getUTCFullYear();
    const closing = dayOf(referenceMonth, closingDay);
    const due = dayOf(dueMonth, dueDay);
    const purchaseName = monthLabel(purchaseMonth, year);
    const dueName = monthLabel(dueMonth, year);
    const referenceName = monthLabel(referenceMonth, year);

    let text;
    if (of > 1) {
      text =
        'Parcela ' +
        number +
        ' de ' +
        of +
        ' da compra de ' +
        purchaseLabel +
        ' (' +
        purchaseName +
        '). ' +
        'A fatura fecha em ' +
        closing +
        ' e vence em ' +
        due +
        '. Conta como gasto de ' +
        referenceName +
        '.';
    } else if (purchaseMonth === dueMonth) {
      text =
        'Comprado em ' +
        purchaseName +
        ' (' +
        purchaseLabel +
        ') e pago em ' +
        dueName +
        ' (vence ' +
        due +
        '). Conta como gasto de ' +
        referenceName +
        '.';
    } else {
      text =
        'Comprado em ' +
        purchaseName +
        ' (' +
        purchaseLabel +
        '), mas só paga em ' +
        dueName +
        ' (vence ' +
        due +
        '). Conta como gasto de ' +
        referenceName +
        '.';
    }
    return { purchaseMonth, referenceMonth, dueMonth, closing, due, text };
  }

  // Explica uma fatura inteira: período das compras, fechamento, vencimento e mês do gasto.
  function describeInvoice({ month, closingDay, dueDay }) {
    const previous = addMonths(month, -1);
    const lastClose = Math.min(closingDay, daysIn(previous));
    const [year, mon] = previous.split('-').map(Number);
    const start = new Date(Date.UTC(year, mon - 1, lastClose + 1));
    const from = two(start.getUTCDate()) + '/' + two(start.getUTCMonth() + 1);
    const dueMonth = dueDay > closingDay ? month : addMonths(month, 1);
    const baseYear = Number(month.slice(0, 4));
    return (
      'Fatura de ' +
      monthLabel(month, baseYear) +
      ': compras de ' +
      from +
      ' a ' +
      dayOf(month, closingDay) +
      ', vence em ' +
      dayOf(dueMonth, dueDay) +
      '. Todas contam como gasto de ' +
      monthLabel(month, baseYear) +
      '.'
    );
  }

  const cardNotes = { describePurchase, describeInvoice };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = cardNotes;
  } else {
    (window.CF = window.CF || {}).cardNotes = cardNotes;
  }
})();
