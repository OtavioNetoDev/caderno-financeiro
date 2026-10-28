(function () {
  const CF = window.CF;
  const { el, api, charts, analyses } = CF;
  const { ANALYSES, ALL_TYPES, monthLabel, makeNames } = analyses;

  const STORAGE_KEY = 'cf_chart_cards';
  const MAX_CARDS = 6;
  const DEFAULT_CARDS = [
    { analysis: 'monthly', type: 'bar', period: 6, serie: 0 },
    { analysis: 'expenseByCategory', type: 'donut', period: 1, serie: 0 },
  ];

  function safe(action) {
    try {
      return action();
    } catch {
      return null;
    }
  }

  // Escolha válida a partir do que está salvo; qualquer valor estranho volta ao padrão da análise.
  function sanitize(card) {
    const analysis = ANALYSES[card && card.analysis] ? card.analysis : 'monthly';
    const def = ANALYSES[analysis];
    return {
      analysis,
      type: ALL_TYPES.includes(card && card.type) ? card.type : def.defaultType,
      period: def.periods.includes(card && card.period) ? card.period : def.defaultPeriod,
      serie: Number.isInteger(card && card.serie) && card.serie >= 0 ? card.serie : 0,
    };
  }

  function loadCards() {
    const raw = safe(() => localStorage.getItem(STORAGE_KEY));
    const parsed = raw ? safe(() => JSON.parse(raw)) : null;
    if (!Array.isArray(parsed)) {
      return DEFAULT_CARDS.map(sanitize);
    }
    return parsed.slice(0, MAX_CARDS).map(sanitize);
  }

  function saveCards(cards) {
    safe(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(cards)));
  }

  function select(label, options, current, onchange) {
    return el(
      'label',
      { class: 'field' },
      el('span', { class: 'muted' }, label),
      el(
        'select',
        { onchange: (event) => onchange(event.target.value) },
        options.map(([value, text]) =>
          el('option', { value: String(value), selected: String(value) === String(current) }, text),
        ),
      ),
    );
  }

  function periodText(analysis, config, month) {
    if (analysis.local) {
      return 'saldo atual';
    }
    if (config.period === 1) {
      return monthLabel(month);
    }
    return 'últimos ' + config.period + ' meses até ' + monthLabel(month);
  }

  function chartCard(config, state, { onChange, onRemove }) {
    const controls = el('div', { class: 'chart-controls' });
    const host = el('div', { class: 'chart-host' });
    let run = 0;

    async function paint() {
      const current = ++run;
      const analysis = ANALYSES[config.analysis];
      host.replaceChildren(el('p', { class: 'muted chart-empty' }, 'Carregando...'));
      try {
        const names = makeNames(state.categories, state.accounts);
        const data = analysis.local
          ? analysis.local(state)
          : await api(analysis.url(state.month, config.period));
        if (current !== run) {
          return;
        }
        const spec = analysis.toSpec(data, names);
        spec.type = config.type;
        spec.title = analysis.label + ' · ' + periodText(analysis, config, state.month);

        // Pizza e rosca mostram uma série por vez; o usuário escolhe qual.
        const isSlice = charts.types[config.type] && charts.types[config.type].slices;
        drawControls(isSlice && spec.series.length > 1 ? spec.series : null);
        if (isSlice && spec.series.length > 1) {
          const chosen = spec.series[config.serie] ? config.serie : 0;
          spec.series = [spec.series[chosen]];
          spec.title += ' · ' + spec.series[0].name;
        }
        host.replaceChildren();
        charts.render(host, spec);
      } catch (err) {
        if (current === run) {
          host.replaceChildren(el('p', { class: 'error' }, err.message));
        }
      }
    }

    function change(patch) {
      Object.assign(config, patch);
      const def = ANALYSES[config.analysis];
      if (patch.analysis) {
        // Trocar a análise volta ao tipo e ao período recomendados para ela.
        Object.assign(config, { type: def.defaultType, period: def.defaultPeriod, serie: 0 });
      }
      onChange();
      drawControls(null);
      paint();
    }

    function drawControls(seriesList) {
      const def = ANALYSES[config.analysis];
      controls.replaceChildren(
        select(
          'Dados',
          Object.entries(ANALYSES).map(([key, item]) => [key, item.label]),
          config.analysis,
          (value) => change({ analysis: value }),
        ),
        select(
          'Gráfico',
          ALL_TYPES.map((type) => [type, charts.types[type].label]),
          config.type,
          (value) => change({ type: value }),
        ),
        def.periods.length > 1
          ? select(
              def.periods[0] === 1 ? 'Meses somados' : 'Meses',
              def.periods.map((value) => [value, value === 1 ? 'Só o mês' : value + ' meses']),
              config.period,
              (value) => change({ period: Number(value) }),
            )
          : null,
        seriesList
          ? select(
              'Série',
              seriesList.map((item, index) => [index, item.name]),
              config.serie,
              (value) => change({ serie: Number(value) }),
            )
          : null,
        el(
          'button',
          { class: 'btn small ghost', type: 'button', onclick: onRemove },
          'Remover gráfico',
        ),
      );
    }

    drawControls(null);
    paint();
    return el('section', { class: 'card chart-card' }, controls, host);
  }

  function render(container, state) {
    let cards = loadCards();
    const grid = el('div', { class: 'chart-grid' });
    const addButton = el('button', { class: 'btn primary', type: 'button' }, 'Adicionar gráfico');
    const resetButton = el('button', { class: 'btn ghost', type: 'button' }, 'Restaurar padrão');

    function draw() {
      addButton.disabled = cards.length >= MAX_CARDS;
      if (!cards.length) {
        grid.replaceChildren(
          el('p', { class: 'muted' }, 'Nenhum gráfico por aqui. Use "Adicionar gráfico".'),
        );
        return;
      }
      grid.replaceChildren(
        ...cards.map((config) =>
          chartCard(config, state, {
            onChange: () => saveCards(cards),
            onRemove: () => {
              cards = cards.filter((item) => item !== config);
              saveCards(cards);
              draw();
            },
          }),
        ),
      );
    }

    addButton.addEventListener('click', () => {
      const used = new Set(cards.map((card) => card.analysis));
      const next = Object.keys(ANALYSES).find((key) => !used.has(key)) || 'monthly';
      cards = [...cards, sanitize({ analysis: next })];
      saveCards(cards);
      draw();
    });
    resetButton.addEventListener('click', () => {
      cards = DEFAULT_CARDS.map(sanitize);
      saveCards(cards);
      draw();
    });

    container.replaceChildren(
      el(
        'section',
        { class: 'card' },
        el('h2', {}, 'Gráficos'),
        el(
          'p',
          { class: 'muted' },
          'Escolha os dados, o tipo de gráfico e o período de cada gráfico. Você pode ter até ' +
            MAX_CARDS +
            ' ao mesmo tempo e eles ficam salvos neste navegador. ' +
            'Despesas incluem as compras do cartão pela fatura; pagamentos de fatura e lançamentos pendentes ficam de fora.',
        ),
        el('div', { class: 'chart-actions' }, addButton, resetButton),
      ),
      grid,
    );
    draw();
  }

  (CF.views = CF.views || {}).reports = { title: 'Gráficos', order: 3, monthly: true, render };
})();
