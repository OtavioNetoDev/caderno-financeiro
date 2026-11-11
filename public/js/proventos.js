(function () {
  const CF = window.CF;
  const { el, api, money } = CF;
  const fmt = money.formatMoney;

  // Ações e FIIs pagam proventos; poupança, CDB, Tesouro e caixinhas pagam rendimentos.
  const MARKET = ['stock', 'fii'];
  const WORDS = {
    market: {
      storage: 'proventos',
      title: 'Proventos recebidos',
      intro:
        'Dividendos, JCP e rendimentos que ações e fundos imobiliários pagam. Fica separado das receitas e não entra no lucro do mês. Poupança, CDB e Tesouro ficam na aba Rendimentos.',
      formTitle: 'Registrar provento',
      noInvestments:
        'Cadastre uma ação ou um fundo imobiliário na tela Investimentos para poder registrar proventos.',
      showQuantity: true,
      removeConfirm: 'Remover este provento?',
      listTitle: 'Proventos do mês',
      emptyMonth: 'Nenhum provento registrado neste mês.',
      seriesName: 'Proventos',
      chartMonth: 'Proventos por investimento (mês)',
      ariaMonth: 'Proventos por investimento no mês',
      emptyMonthChart: 'Nenhum provento neste mês.',
      chartEvolution: 'Proventos por mês (12 meses)',
      ariaEvolution: 'Proventos recebidos por mês nos últimos 12 meses',
      emptyYear: 'Nenhum provento nos últimos 12 meses.',
      chartYear: 'Proventos por investimento (12 meses)',
      ariaYear: 'Proventos por investimento nos últimos 12 meses',
    },
    fixed: {
      storage: 'rendimentos',
      title: 'Rendimentos recebidos',
      intro:
        'O que poupança, CDB, Tesouro e caixinhas rendem e é creditado para você. Registre aqui o valor creditado. Fica separado das receitas e não entra no lucro do mês. Ações e fundos imobiliários ficam na aba Proventos.',
      formTitle: 'Registrar rendimento',
      noInvestments:
        'Cadastre uma poupança, CDB, Tesouro ou caixinha na tela Investimentos para poder registrar rendimentos.',
      showQuantity: false,
      removeConfirm: 'Remover este rendimento?',
      listTitle: 'Rendimentos do mês',
      emptyMonth: 'Nenhum rendimento registrado neste mês.',
      seriesName: 'Rendimentos',
      chartMonth: 'Rendimentos por investimento (mês)',
      ariaMonth: 'Rendimentos por investimento no mês',
      emptyMonthChart: 'Nenhum rendimento neste mês.',
      chartEvolution: 'Rendimentos por mês (12 meses)',
      ariaEvolution: 'Rendimentos recebidos por mês nos últimos 12 meses',
      emptyYear: 'Nenhum rendimento nos últimos 12 meses.',
      chartYear: 'Rendimentos por investimento (12 meses)',
      ariaYear: 'Rendimentos por investimento nos últimos 12 meses',
    },
  };
  let words = WORDS.market;

  const stat = (label, value, cls) =>
    el(
      'div',
      { class: 'stat' },
      el('span', { class: 'muted' }, label),
      el('strong', { class: cls }, value),
    );

  function showError(node, err) {
    node.textContent = [err.message, ...(err.details || [])].join(' · ');
    node.hidden = false;
  }

  // "2026-10" e 12 -> os 12 meses até outubro/2026, do mais antigo para o mais novo.
  function lastMonths(month, count) {
    const [year, mon] = month.split('-').map(Number);
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(Date.UTC(year, mon - 1 - (count - 1 - index), 1));
      return date.toISOString().slice(0, 7);
    });
  }

  const query = (range, group) =>
    '?from=' +
    encodeURIComponent(range.from) +
    '&to=' +
    encodeURIComponent(range.to) +
    '&group=' +
    group;

  function summaryCard(monthReport, yearReport) {
    return el(
      'section',
      { class: 'card stack' },
      el('h2', {}, words.title),
      el('p', { class: 'muted' }, words.intro),
      el(
        'div',
        { class: 'stats' },
        stat('Recebido no mês', fmt(monthReport.total), 'income'),
        stat('Pagamentos no mês', String(monthReport.count)),
        stat('Últimos 12 meses', fmt(yearReport.total), 'income'),
        stat('Média mensal (12 meses)', fmt(Math.round(yearReport.total / 12)), 'income'),
      ),
    );
  }

  // Cadastro rápido: escolhe o investimento e registra o provento.
  function entryForm(investments, state, reload) {
    if (!investments.length) {
      return el(
        'section',
        { class: 'card stack' },
        el('h2', {}, words.formTitle),
        el('p', { class: 'muted' }, words.noInvestments),
      );
    }
    const asset = el(
      'select',
      { 'aria-label': 'Investimento' },
      ...investments.map((item) =>
        el(
          'option',
          { value: item._id },
          item.personName ? item.name + ' (de ' + item.personName + ')' : item.name,
        ),
      ),
    );
    const amount = el('input', {
      type: 'text',
      inputmode: 'decimal',
      placeholder: 'Valor recebido (ex.: 12,50)',
      required: true,
    });
    const defaultDate =
      state.month === money.currentMonth() ? money.todayISO() : state.month + '-01';
    const date = el('input', { type: 'date', value: defaultDate, required: true });
    const quantity = el('input', {
      type: 'text',
      inputmode: 'decimal',
      placeholder: 'Cotas (opcional)',
    });
    const notes = el('input', {
      type: 'text',
      placeholder: 'Observação (opcional)',
      maxlength: 200,
    });
    const error = el('p', { class: 'error', role: 'alert', hidden: true });

    return el(
      'form',
      {
        class: 'card form',
        onsubmit: async (event) => {
          event.preventDefault();
          error.hidden = true;
          const cents = money.parseMoney(amount.value);
          if (!cents) {
            error.textContent = 'Informe um valor válido, como 12,50';
            error.hidden = false;
            return;
          }
          const cotas = quantity.value.trim()
            ? Number(quantity.value.replace(',', '.'))
            : undefined;
          try {
            await api('/investments/' + asset.value + '/entries', {
              method: 'POST',
              body: {
                kind: 'income',
                amount: cents,
                date: money.toApiDate(date.value),
                quantity: Number.isFinite(cotas) ? cotas : undefined,
                notes: notes.value,
              },
            });
            await reload();
          } catch (err) {
            showError(error, err);
          }
        },
      },
      el('h2', {}, words.formTitle),
      asset,
      amount,
      date,
      ...(words.showQuantity ? [quantity] : []),
      notes,
      el('button', { class: 'btn primary', type: 'submit' }, 'Registrar'),
      error,
    );
  }

  function listCard(monthReport, reload) {
    const rows = monthReport.items.map((item) =>
      el(
        'li',
        { class: 'tx' },
        el(
          'div',
          { class: 'tx-main' },
          el('strong', {}, item.investmentName),
          el(
            'span',
            { class: 'muted' },
            [money.formatDate(item.date), item.quantity ? item.quantity + ' cotas' : '', item.notes]
              .filter(Boolean)
              .join(' · '),
          ),
        ),
        el('span', { class: 'amount income' }, fmt(item.amount)),
        el(
          'button',
          {
            class: 'btn small danger',
            type: 'button',
            onclick: async () => {
              if (confirm(words.removeConfirm)) {
                await api('/investments/' + item.investmentId + '/entries/' + item.id, {
                  method: 'DELETE',
                });
                await reload();
              }
            },
          },
          'Remover',
        ),
      ),
    );
    return el(
      'section',
      { class: 'card' },
      el('h2', {}, words.listTitle),
      rows.length
        ? el('ul', { class: 'list' }, ...rows)
        : el('p', { class: 'muted' }, words.emptyMonth),
    );
  }

  // Cada gráfico tem seu seletor de tipo; a escolha fica salva neste navegador.
  function chartCard(title, key, fallbackType, spec) {
    const types = CF.analyses.ALL_TYPES;
    const storageKey = 'cf_' + words.storage + '_' + key;
    let type = fallbackType;
    try {
      const saved = localStorage.getItem(storageKey);
      type = types.includes(saved) ? saved : fallbackType;
    } catch {
      // Sem armazenamento (janela privada): a escolha só vale nesta tela.
    }
    const host = el('div');
    const draw = () => {
      host.replaceChildren();
      CF.charts.render(host, { ...spec, type, title });
    };
    const select = el(
      'select',
      {
        'aria-label': 'Tipo de gráfico',
        onchange: (event) => {
          type = event.target.value;
          try {
            localStorage.setItem(storageKey, type);
          } catch {
            // Sem armazenamento: a escolha só vale nesta tela.
          }
          draw();
        },
      },
      types.map((item) =>
        el('option', { value: item, selected: item === type }, CF.charts.types[item].label),
      ),
    );
    draw();
    return el(
      'section',
      { class: 'card chart-card' },
      el('div', { class: 'chart-controls' }, select),
      host,
    );
  }

  const rankingOf = (list) =>
    CF.chartsCore.foldOther(list.map((item) => ({ label: item.name, value: item.total })));

  function chartGrid(monthReport, yearReport, month) {
    const months = lastMonths(month, 12);
    const totals = new Map(yearReport.byMonth.map((item) => [item.month, item.total]));
    const monthRanking = rankingOf(monthReport.byInvestment);
    const yearRanking = rankingOf(yearReport.byInvestment);
    return el(
      'div',
      { class: 'chart-grid' },
      chartCard(words.chartMonth, 'mes', 'donut', {
        ariaLabel: words.ariaMonth,
        categories: monthRanking.map((item) => item.label),
        series: [{ name: words.seriesName, values: monthRanking.map((item) => item.value) }],
        emptyText: words.emptyMonthChart,
      }),
      chartCard(words.chartEvolution, 'evolucao', 'bar', {
        ariaLabel: words.ariaEvolution,
        categories: months.map(CF.analyses.monthLabel),
        series: [{ name: words.seriesName, values: months.map((item) => totals.get(item) || 0) }],
        emptyText: words.emptyYear,
      }),
      chartCard(words.chartYear, 'ano', 'hbar', {
        ariaLabel: words.ariaYear,
        categories: yearRanking.map((item) => item.label),
        series: [{ name: words.seriesName, values: yearRanking.map((item) => item.value) }],
        emptyText: words.emptyYear,
      }),
    );
  }

  const pct = (value) => value.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';

  // Retorno = provento recebido sobre o valor investido até o fim do mês escolhido.
  function returnsCard(monthReport, yearReport) {
    const yearById = new Map(yearReport.returns.map((item) => [String(item.investmentId), item]));
    const rows = monthReport.returns.map((item) => {
      const year = yearById.get(String(item.investmentId));
      return el(
        'tr',
        {},
        el('td', {}, item.name),
        el('td', { class: 'num' }, fmt(item.invested)),
        el('td', { class: 'num' }, fmt(item.received)),
        el('td', { class: 'num' }, pct(item.percent)),
        el('td', { class: 'num' }, year ? pct(year.percent) : '—'),
      );
    });
    return el(
      'section',
      { class: 'card' },
      el('h2', {}, 'Retorno sobre o que você investiu'),
      el(
        'p',
        { class: 'muted' },
        'Quanto cada investimento pagou em relação ao valor aplicado nele. O valor investido vem dos aportes que você registra na tela Investimentos.',
      ),
      rows.length
        ? el(
            'div',
            { class: 'table-wrap' },
            el(
              'table',
              {},
              el(
                'thead',
                {},
                el(
                  'tr',
                  {},
                  el('th', {}, 'Investimento'),
                  el('th', { class: 'num' }, 'Investido'),
                  el('th', { class: 'num' }, 'Recebido no mês'),
                  el('th', { class: 'num' }, 'Retorno no mês'),
                  el('th', { class: 'num' }, 'Retorno em 12 meses'),
                ),
              ),
              el('tbody', {}, ...rows),
            ),
          )
        : el(
            'p',
            { class: 'muted' },
            'Registre um aporte na tela Investimentos para ver o retorno.',
          ),
    );
  }

  // Proventos de outras pessoas ficam de fora dos seus totais; aqui só um aviso separado.
  function othersNote(monthReport) {
    if (!monthReport.others.length) {
      return null;
    }
    const text = monthReport.others
      .map((item) => item.personName + ' ' + fmt(item.total))
      .join(' · ');
    return el(
      'p',
      { class: 'notice' },
      'Recebido por outras pessoas neste mês (não entra nos seus totais): ' + text,
    );
  }

  // De onde vem o rendimento de cada investimento (definido no botão Rendimento, em Investimentos).
  function howItYields(item) {
    if (item.source === 'daily') {
      return 'ganho por dia informado';
    }
    if (item.source === 'cdipct') {
      return item.cdiPercent.toLocaleString('pt-BR') + '% do CDI';
    }
    if (item.source === 'rate') {
      return item.annualRate.toLocaleString('pt-BR') + '% ao ano';
    }
    if (item.source === 'cdi') {
      return '100% do CDI';
    }
    if (item.source === 'manual') {
      return 'a partir do valor real informado';
    }
    return 'sem rendimento estimado';
  }

  // Rende por dia útil: o ganho informado ou o que a taxa dá em 1/252 de ano.
  const dailyOf = (item) =>
    item.dailyGain > 0
      ? item.dailyGain
      : Math.round(item.value * (Math.pow(1 + item.rate / 100, 1 / 252) - 1));

  // Quanto cada renda fixa rende por dia útil e por mês, para você conferir com o app do banco.
  function estimateCard(portfolio) {
    if (!portfolio) {
      return null;
    }
    const items = portfolio.groups
      .flatMap((group) => group.items)
      .filter((item) => !MARKET.includes(item.type) && item.applied > 0);
    const header = el(
      'p',
      { class: 'muted' },
      'Estimativa, sem impostos, pelo que você definiu em Investimentos (botão Rendimento): ganho por dia útil, taxa anual ou % do CDI. Poupança, CDB, Tesouro e caixinhas entram aqui.',
    );
    if (!items.length) {
      return el(
        'section',
        { class: 'card' },
        el('h2', {}, 'Quanto rende'),
        header,
        el('p', { class: 'muted' }, 'Nenhuma renda fixa com valor aplicado ainda.'),
      );
    }
    const rows = items.map((item) =>
      el(
        'tr',
        {},
        el('td', {}, item.name),
        el('td', { class: 'num' }, fmt(item.applied)),
        el('td', {}, howItYields(item)),
        el('td', { class: 'num' }, fmt(dailyOf(item))),
        el('td', { class: 'num' }, fmt(item.monthly)),
        el('td', { class: 'num' }, fmt(item.value)),
      ),
    );
    const sum = (pick) => items.reduce((total, item) => total + pick(item), 0);
    rows.push(
      el(
        'tr',
        {},
        el('td', {}, el('strong', {}, 'Total')),
        el('td', { class: 'num' }, el('strong', {}, fmt(sum((item) => item.applied)))),
        el('td', {}),
        el('td', { class: 'num' }, el('strong', {}, fmt(sum(dailyOf)))),
        el('td', { class: 'num' }, el('strong', {}, fmt(sum((item) => item.monthly)))),
        el('td', { class: 'num' }, el('strong', {}, fmt(sum((item) => item.value)))),
      ),
    );
    return el(
      'section',
      { class: 'card' },
      el('h2', {}, 'Quanto rende'),
      header,
      el(
        'div',
        { class: 'table-wrap' },
        el(
          'table',
          {},
          el(
            'thead',
            {},
            el(
              'tr',
              {},
              el('th', {}, 'Investimento'),
              el('th', { class: 'num' }, 'Aplicado'),
              el('th', {}, 'Como rende'),
              el('th', { class: 'num' }, 'Por dia útil'),
              el('th', { class: 'num' }, 'Por mês'),
              el('th', { class: 'num' }, 'Valor atual'),
            ),
          ),
          el('tbody', {}, ...rows),
        ),
      ),
    );
  }

  async function render(group, container, state, reload) {
    let investments;
    let monthReport;
    let yearReport;
    let estimate;
    try {
      const months = lastMonths(state.month, 12);
      const monthRange = money.monthRange(state.month);
      const yearRange = { from: money.monthRange(months[0]).from, to: monthRange.to };
      [investments, monthReport, yearReport, estimate] = await Promise.all([
        api('/investments'),
        api('/investments/income' + query(monthRange, group)),
        api('/investments/income' + query(yearRange, group)),
        group === 'fixed' ? api('/investments/portfolio') : null,
      ]);
    } catch (err) {
      container.replaceChildren(el('p', { class: 'error' }, err.message));
      return;
    }

    words = WORDS[group];
    const summary = summaryCard(monthReport, yearReport);
    const ofGroup = investments.filter(
      (item) => MARKET.includes(item.type) === (group === 'market'),
    );
    const form = entryForm(ofGroup, state, reload);
    const list = listCard(monthReport, reload);
    const charts = chartGrid(monthReport, yearReport, state.month);
    const returns = returnsCard(monthReport, yearReport);
    const others = othersNote(monthReport);
    const sections = [summary, estimateCard(estimate), others, form, returns, charts, list].filter(
      Boolean,
    );
    container.replaceChildren(...sections);
  }

  const renderFor = (group) => (container, state, reload) =>
    render(group, container, state, reload);

  CF.views = CF.views || {};
  CF.views.proventos = {
    title: 'Proventos',
    order: 45,
    monthly: true,
    render: renderFor('market'),
  };
  CF.views.rendimentos = {
    title: 'Rendimentos',
    order: 46,
    monthly: true,
    render: renderFor('fixed'),
  };
})();
