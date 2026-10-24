(function () {
  const { el, money, projection } = window.CF;
  const fmt = money.formatMoney;

  const field = (label, input) =>
    el('label', { class: 'field' }, el('span', { class: 'muted' }, label), input);
  const stat = (label, value, cls) =>
    el(
      'div',
      { class: 'stat' },
      el('span', { class: 'muted' }, label),
      el('strong', { class: cls }, value),
    );

  function render(container) {
    // Valores vindos da tela de investimentos ("Simular").
    const preset = window.CF.simDefaults || {};
    window.CF.simDefaults = null;

    const initial = el('input', {
      type: 'text',
      inputmode: 'decimal',
      value: preset.initialCents
        ? (preset.initialCents / 100).toFixed(2).replace('.', ',')
        : '0,00',
    });
    const monthly = el('input', { type: 'text', inputmode: 'decimal', value: '200,00' });
    const rateInput = el('input', {
      type: 'text',
      inputmode: 'decimal',
      value: preset.annualPercent != null ? String(preset.annualPercent).replace('.', ',') : '10',
    });
    const yearsInput = el('input', {
      type: 'number',
      min: 1,
      max: projection.MAX_YEARS,
      step: 1,
      value: '30',
    });
    const out = el('div', { class: 'stack' });

    function calc() {
      const initialCents = initial.value.trim() ? money.parseMoney(initial.value) : 0;
      const monthlyCents = monthly.value.trim() ? money.parseMoney(monthly.value) : 0;
      const rate = rateInput.value.trim() ? Number(rateInput.value.replace(',', '.')) : NaN;
      const years = Number(yearsInput.value);
      if (
        initialCents === null ||
        monthlyCents === null ||
        !Number.isFinite(rate) ||
        rate < 0 ||
        !Number.isInteger(years) ||
        years < 1 ||
        years > projection.MAX_YEARS
      ) {
        out.replaceChildren(
          el(
            'p',
            { class: 'error' },
            'Confira os valores: taxa maior ou igual a zero e prazo de 1 a 100 anos.',
          ),
        );
        return;
      }

      const rows = projection.project({
        initialCents,
        monthlyContributionCents: monthlyCents,
        annualPercent: rate,
        years,
      });
      const last = rows[rows.length - 1];
      const yields = projection.estimateYield(last.balanceCents, rate);

      const lines = rows.map((row) =>
        el(
          'tr',
          {},
          el('td', {}, row.year + (row.year === 1 ? ' ano' : ' anos')),
          el('td', { class: 'num' }, fmt(row.investedCents)),
          el('td', { class: 'num' }, fmt(row.interestCents)),
          el('td', { class: 'num' }, fmt(row.balanceCents)),
        ),
      );

      out.replaceChildren(
        el(
          'section',
          { class: 'card' },
          el('h2', {}, 'Resultado em ' + years + (years === 1 ? ' ano' : ' anos')),
          el(
            'div',
            { class: 'stats' },
            stat('Valor final', fmt(last.balanceCents), 'income'),
            stat('Total investido', fmt(last.investedCents), ''),
            stat('Juros acumulados', fmt(last.interestCents), 'investment'),
          ),
          el(
            'p',
            { class: 'muted' },
            'Rendimento estimado sobre o valor final: ' +
              fmt(yields.daily) +
              ' por dia · ' +
              fmt(yields.weekly) +
              ' por semana · ' +
              fmt(yields.monthly) +
              ' por mês.',
          ),
          el(
            'p',
            { class: 'muted' },
            'Simulação com taxa fixa, sem inflação nem impostos. Não é garantia de rendimento.',
          ),
        ),
        el(
          'section',
          { class: 'card' },
          el('h2', {}, 'Ano a ano'),
          el(
            'div',
            { class: 'table-wrap scroll-y' },
            el(
              'table',
              {},
              el(
                'thead',
                {},
                el(
                  'tr',
                  {},
                  el('th', {}, 'Prazo'),
                  el('th', { class: 'num' }, 'Investido'),
                  el('th', { class: 'num' }, 'Juros'),
                  el('th', { class: 'num' }, 'Saldo'),
                ),
              ),
              el('tbody', {}, lines),
            ),
          ),
        ),
      );
    }

    [initial, monthly, rateInput, yearsInput].forEach((input) =>
      input.addEventListener('input', calc),
    );

    container.replaceChildren(
      el(
        'section',
        { class: 'card' },
        el('h2', {}, 'Simulador de investimentos'),
        el(
          'div',
          { class: 'form' },
          field('Valor inicial (R$)', initial),
          field('Aporte mensal (R$)', monthly),
          field('Taxa anual (% a.a.)', rateInput),
          field('Prazo (1 a 100 anos)', yearsInput),
        ),
      ),
      out,
    );
    calc();
  }

  (window.CF.views = window.CF.views || {}).simulator = { title: 'Simulador', order: 50, render };
})();
