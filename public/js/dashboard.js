(function () {
  const CF = window.CF;
  const { el, money } = CF;

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

  // Compara com o mês anterior usando as mesmas regras do resumo (GET /reports/monthly).
  async function loadComparison(host, month) {
    try {
      const data = await CF.api('/reports/monthly?end=' + month + '&months=2');
      const result = CF.comparison.compareMonths(data);
      // Se a tela já foi trocada (outro mês ou outra aba), não pinta em cima.
      if (!result || !host.isConnected) {
        return;
      }
      host.replaceChildren(
        el(
          'span',
          { class: 'muted' },
          'Comparado com ' + CF.analyses.monthLabel(result.previousMonth) + ':',
        ),
        ...result.items.map((item) =>
          el(
            'div',
            { class: 'compare-row' },
            el('span', {}, item.label),
            el(
              'strong',
              { class: 'tone-' + item.tone },
              CF.comparison.describeChange(item, money.formatMoney),
            ),
          ),
        ),
      );
    } catch {
      // A comparação é um extra: se falhar, o resumo do mês continua normal.
    }
  }

  const CHOICE_KEY = 'cf_overview_chart';

  function readChoice() {
    try {
      const saved = localStorage.getItem(CHOICE_KEY);
      return CF.analyses.ALL_TYPES.includes(saved) ? saved : 'donut';
    } catch {
      return 'donut';
    }
  }

  function saveChoice(type) {
    try {
      localStorage.setItem(CHOICE_KEY, type);
    } catch {
      // Sem armazenamento (janela privada): a escolha só vale nesta tela.
    }
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
      // Pagamento de fatura não é gasto: as compras do cartão entram por categoria.
      if (item.type !== 'expense' || item.invoicePayment) {
        continue;
      }
      if (item.status === 'pending') {
        pending += item.amount;
        continue;
      }
      const name = categoryNames.get(item.categoryId) || 'Sem categoria';
      byCategory.set(name, (byCategory.get(name) || 0) + item.amount);
    }
    // Compras do cartão, pelo mês da fatura.
    for (const item of summary.cardByCategory || []) {
      const name = categoryNames.get(item.categoryId) || 'Sem categoria';
      byCategory.set(name, (byCategory.get(name) || 0) + item.total);
    }
    const ranking = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);
    const folded = CF.chartsCore.foldOther(ranking.map(([label, value]) => ({ label, value })));

    // O tipo do gráfico é escolha do usuário e fica salvo neste navegador.
    const types = CF.analyses.ALL_TYPES;
    let chartType = readChoice();
    const chartHost = el('div');
    function drawChart() {
      chartHost.replaceChildren();
      CF.charts.render(chartHost, {
        type: chartType,
        ariaLabel: 'Despesas por categoria no mês',
        categories: folded.map((item) => item.label),
        series: [{ name: 'Despesas', values: folded.map((item) => item.value) }],
        emptyText: 'Sem despesas confirmadas neste mês.',
      });
    }
    const typeSelect = el(
      'select',
      {
        'aria-label': 'Tipo de gráfico',
        onchange: (event) => {
          chartType = event.target.value;
          saveChoice(chartType);
          drawChart();
        },
      },
      types.map((type) =>
        el('option', { value: type, selected: type === chartType }, CF.charts.types[type].label),
      ),
    );

    const compareHost = el('div', { class: 'compare' });
    drawChart();
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
          stat('No cartão (fatura do mês)', money.formatMoney(summary.cardExpense || 0), 'expense'),
          stat('Pendente (despesas)', money.formatMoney(pending), ''),
        ),
        el('p', { class: 'muted' }, analysis(summary)),
        compareHost,
      ),
      el(
        'section',
        { class: 'card' },
        el('div', { class: 'chart-head' }, el('h2', {}, 'Despesas por categoria'), typeSelect),
        chartHost,
        el(
          'p',
          { class: 'muted' },
          'Mais gráficos (por mês, dia, pessoa, conta e outros) na aba Gráficos.',
        ),
      ),
    );
    loadComparison(compareHost, state.month);
  };
})();
