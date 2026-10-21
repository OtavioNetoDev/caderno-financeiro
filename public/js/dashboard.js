(function () {
  const { el, money } = window.CF;

  function analysis(summary) {
    if (summary.income === 0 && summary.expense === 0) {
      return 'Ainda não há movimentações confirmadas neste mês.';
    }
    if (summary.profit < 0) {
      return 'Atenção: as despesas passaram das receitas neste mês.';
    }
    const percent = summary.investedPercent.toLocaleString('pt-BR');
    if (summary.investedPercent >= 20) {
      return 'Muito bom: sobra positiva e ' + percent + '% das receitas investidas.';
    }
    if (summary.investedPercent > 0) {
      return 'Sobra positiva e ' + percent + '% investido. Dá para aumentar o ritmo dos aportes.';
    }
    return 'Sobra positiva, mas ainda nada foi investido neste mês.';
  }

  window.CF.renderDashboard = function renderDashboard(container, state) {
    const summary = state.summary;
    const stat = (label, value, cls) =>
      el(
        'div',
        { class: 'stat' },
        el('span', { class: 'muted' }, label),
        el('strong', { class: cls }, value),
      );

    const categoryNames = new Map(state.categories.map((item) => [item._id, item.name]));
    const byCategory = new Map();
    let pending = 0;
    for (const item of state.transactions) {
      if (item.type !== 'expense') {
        continue;
      }
      if (item.status === 'pending') {
        pending += item.amount;
        continue;
      }
      const name = categoryNames.get(item.categoryId) || 'Sem categoria';
      byCategory.set(name, (byCategory.get(name) || 0) + item.amount);
    }
    const ranking = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
    const max = ranking.length ? ranking[0][1] : 1;

    const bars = ranking.map(([name, total]) =>
      el(
        'div',
        { class: 'bar-row' },
        el('span', {}, name),
        el(
          'div',
          { class: 'bar' },
          el('div', {
            class: 'bar-fill',
            style: 'width:' + Math.max(2, Math.round((total / max) * 100)) + '%',
          }),
        ),
        el('strong', {}, money.formatMoney(total)),
      ),
    );

    container.replaceChildren(
      el(
        'section',
        { class: 'card' },
        el('h2', {}, 'Resumo do mês'),
        el(
          'div',
          { class: 'stats' },
          stat('Receitas', money.formatMoney(summary.income), 'income'),
          stat('Despesas', money.formatMoney(summary.expense), 'expense'),
          stat(
            'Lucro',
            money.formatMoney(summary.profit),
            summary.profit < 0 ? 'expense' : 'income',
          ),
          stat('Investido', money.formatMoney(summary.investment), 'investment'),
          stat('% investido', summary.investedPercent.toLocaleString('pt-BR') + '%', ''),
          stat('Pendente (despesas)', money.formatMoney(pending), ''),
        ),
        el('p', { class: 'muted' }, analysis(summary)),
      ),
      el(
        'section',
        { class: 'card' },
        el('h2', {}, 'Despesas por categoria'),
        bars.length ? bars : el('p', { class: 'muted' }, 'Sem despesas confirmadas neste mês.'),
      ),
    );
  };
})();
