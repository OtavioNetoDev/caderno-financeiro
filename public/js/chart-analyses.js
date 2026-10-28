(function () {
  // Catálogo das análises: de onde vêm os dados e como viram a especificação do gráfico.
  // As transformações são puras (sem DOM), para poderem ser testadas com node --test.
  const core =
    typeof module !== 'undefined' && module.exports
      ? require('./charts-core.js')
      : window.CF.chartsCore;

  const MONTH_NAMES = [
    'jan',
    'fev',
    'mar',
    'abr',
    'mai',
    'jun',
    'jul',
    'ago',
    'set',
    'out',
    'nov',
    'dez',
  ];

  // "2026-10" -> "out/26"
  function monthLabel(month) {
    const [year, mon] = month.split('-');
    return MONTH_NAMES[Number(mon) - 1] + '/' + year.slice(2);
  }

  // Cores por significado, escolhidas da paleta validada (receita e despesa não usam verde x vermelho).
  const COLORS = {
    income: 'var(--series-3)',
    expense: 'var(--series-2)',
    investment: 'var(--series-1)',
    profit: 'var(--series-7)',
  };

  const ALL_TYPES = ['bar', 'stacked', 'hbar', 'line', 'area', 'pie', 'donut', 'radar'];

  // Ordena do maior para o menor e agrupa o excedente em "Outros" (a paleta tem 8 cores).
  function rankedSpec(items, nameOf, seriesName, categoryLabel) {
    const folded = core.foldOther(
      items.map((item) => ({ label: nameOf(item.key), value: item.total })),
      core.PALETTE_SIZE,
    );
    return {
      categoryLabel,
      valueLabel: seriesName,
      categories: folded.map((item) => item.label),
      series: [{ name: seriesName, values: folded.map((item) => item.value) }],
    };
  }

  const breakdownUrl = (by, type) => (month, period) =>
    `/reports/breakdown?month=${month}&by=${by}&type=${type}&months=${period}`;

  const BREAKDOWN_PERIODS = [1, 3, 6, 12];

  const ANALYSES = {
    monthly: {
      label: 'Receitas, despesas e aportes por mês',
      periods: [3, 6, 12, 24],
      defaultPeriod: 6,
      defaultType: 'bar',
      url: (month, period) => `/reports/monthly?end=${month}&months=${period}`,
      toSpec(data) {
        return {
          categoryLabel: 'Mês',
          categories: data.months.map(monthLabel),
          series: [
            { name: 'Receitas', values: data.income, color: COLORS.income },
            { name: 'Despesas', values: data.expense, color: COLORS.expense },
            { name: 'Aportes', values: data.investment, color: COLORS.investment },
            { name: 'Lucro', values: data.profit, color: COLORS.profit },
          ],
        };
      },
    },
    daily: {
      label: 'Movimento dia a dia do mês',
      periods: [1],
      defaultPeriod: 1,
      defaultType: 'bar',
      url: (month) => `/reports/daily?month=${month}`,
      toSpec(data) {
        return {
          categoryLabel: 'Dia',
          categories: data.days.map((day) => String(Number(day.slice(8)))),
          series: [
            { name: 'Receitas', values: data.income, color: COLORS.income },
            { name: 'Despesas', values: data.expense, color: COLORS.expense },
            { name: 'Aportes', values: data.investment, color: COLORS.investment },
          ],
        };
      },
    },
    cumulative: {
      label: 'Evolução acumulada do mês',
      periods: [1],
      defaultPeriod: 1,
      defaultType: 'area',
      url: (month) => `/reports/daily?month=${month}`,
      toSpec(data) {
        const income = core.cumulative(data.income);
        const expense = core.cumulative(data.expense);
        return {
          categoryLabel: 'Dia',
          categories: data.days.map((day) => String(Number(day.slice(8)))),
          series: [
            { name: 'Receitas', values: income, color: COLORS.income },
            { name: 'Despesas', values: expense, color: COLORS.expense },
            {
              name: 'Saldo do mês',
              values: income.map((value, i) => value - expense[i]),
              color: COLORS.profit,
            },
          ],
        };
      },
    },
    expenseByCategory: {
      label: 'Despesas por categoria',
      periods: BREAKDOWN_PERIODS,
      defaultPeriod: 1,
      defaultType: 'donut',
      url: breakdownUrl('category', 'expense'),
      toSpec: (data, names) =>
        rankedSpec(data.items, (key) => names.category(key), 'Despesas', 'Categoria'),
    },
    incomeByCategory: {
      label: 'Receitas por categoria',
      periods: BREAKDOWN_PERIODS,
      defaultPeriod: 1,
      defaultType: 'donut',
      url: breakdownUrl('category', 'income'),
      toSpec: (data, names) =>
        rankedSpec(data.items, (key) => names.category(key), 'Receitas', 'Categoria'),
    },
    investmentByCategory: {
      label: 'Aportes por categoria',
      periods: BREAKDOWN_PERIODS,
      defaultPeriod: 3,
      defaultType: 'hbar',
      url: breakdownUrl('category', 'investment'),
      toSpec: (data, names) =>
        rankedSpec(data.items, (key) => names.category(key), 'Aportes', 'Categoria'),
    },
    expenseByPerson: {
      label: 'Despesas por pessoa',
      periods: BREAKDOWN_PERIODS,
      defaultPeriod: 1,
      defaultType: 'hbar',
      url: breakdownUrl('person', 'expense'),
      toSpec: (data) => rankedSpec(data.items, (key) => key || 'Sem pessoa', 'Despesas', 'Pessoa'),
    },
    expenseByAccount: {
      label: 'Despesas por conta',
      periods: BREAKDOWN_PERIODS,
      defaultPeriod: 1,
      defaultType: 'pie',
      url: breakdownUrl('account', 'expense'),
      toSpec: (data, names) =>
        rankedSpec(data.items, (key) => names.account(key), 'Despesas', 'Conta'),
    },
    expenseByWeekday: {
      label: 'Despesas por dia da semana',
      periods: BREAKDOWN_PERIODS,
      defaultPeriod: 3,
      defaultType: 'radar',
      url: breakdownUrl('weekday', 'expense'),
      toSpec(data) {
        return {
          categoryLabel: 'Dia da semana',
          categories: data.items.map((item) => item.key),
          series: [
            {
              name: 'Despesas',
              values: data.items.map((item) => item.total),
              color: COLORS.expense,
            },
          ],
        };
      },
    },
    netWorth: {
      label: 'Patrimônio por conta (saldo atual)',
      periods: [1],
      defaultPeriod: 1,
      defaultType: 'donut',
      // Já está na tela (saldos das contas), sem nova chamada à API.
      local: (state) =>
        ((state.balances && state.balances.items) || []).map((item) => ({
          key: item.accountId,
          total: item.balance,
        })),
      toSpec: (items, names) => rankedSpec(items, (key) => names.account(key), 'Saldo', 'Conta'),
    },
  };

  // Resolve ids em nomes, com um texto para "sem categoria" e "sem conta".
  function makeNames(categories, accounts) {
    const cat = new Map((categories || []).map((item) => [String(item._id), item.name]));
    const acc = new Map((accounts || []).map((item) => [String(item._id), item.name]));
    return {
      category: (key) => (key && cat.get(String(key))) || 'Sem categoria',
      account: (key) => (key && acc.get(String(key))) || 'Conta removida',
    };
  }

  const api = { ANALYSES, ALL_TYPES, COLORS, monthLabel, makeNames };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    (window.CF = window.CF || {}).analyses = api;
  }
})();
