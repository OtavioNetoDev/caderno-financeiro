(function () {
  // Comparação de um mês com o anterior (sem DOM). Valores em centavos.
  // "good" diz qual direção é boa: receita, lucro e aporte subindo; despesa descendo.
  const METRICS = [
    { key: 'income', label: 'Receitas', good: 'up' },
    { key: 'expense', label: 'Despesas', good: 'down' },
    { key: 'profit', label: 'Lucro', good: 'up' },
    { key: 'investment', label: 'Investido', good: 'up' },
  ];

  // percent: variação sobre o valor absoluto do mês anterior; null quando o anterior é zero.
  function change(current, previous, good) {
    const delta = current - previous;
    let direction = 'same';
    if (delta > 0) {
      direction = 'up';
    } else if (delta < 0) {
      direction = 'down';
    }
    const percent = previous === 0 ? null : Math.round((delta / Math.abs(previous)) * 1000) / 10;
    let tone = 'neutral';
    if (direction !== 'same') {
      tone = direction === good ? 'good' : 'bad';
    }
    return { current, previous, delta, direction, percent, tone };
  }

  // data: resposta de GET /reports/monthly com pelo menos 2 meses (compara os dois últimos).
  function compareMonths(data) {
    if (!data || !Array.isArray(data.months) || data.months.length < 2) {
      return null;
    }
    const last = data.months.length - 1;
    return {
      month: data.months[last],
      previousMonth: data.months[last - 1],
      items: METRICS.map((metric) => ({
        key: metric.key,
        label: metric.label,
        ...change(data[metric.key][last], data[metric.key][last - 1], metric.good),
      })),
    };
  }

  const ARROW = { up: '▲', down: '▼', same: '=' };

  // Texto da variação, com seta e sinal (não depende só da cor). formatMoney recebe centavos.
  function describeChange(item, formatMoney) {
    if (item.direction === 'same') {
      return '= igual ao mês anterior';
    }
    const sign = item.delta > 0 ? '+' : '−';
    const money = sign + formatMoney(Math.abs(item.delta));
    if (item.percent === null) {
      return ARROW[item.direction] + ' ' + money + ' (mês anterior zerado)';
    }
    const percent = Math.abs(item.percent).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    return ARROW[item.direction] + ' ' + percent + '% (' + money + ')';
  }

  const comparison = { METRICS, change, compareMonths, describeChange };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = comparison;
  } else {
    (window.CF = window.CF || {}).comparison = comparison;
  }
})();
