(function () {
  const { el, api, money } = window.CF;
  const fmt = money.formatMoney;
  const TYPES = {
    cdb: 'CDB',
    fii: 'Fundo imobiliário',
    fund: 'Fundo',
    stock: 'Ações',
    treasury: 'Tesouro',
    reserve: 'Reserva/cofrinho',
    savings: 'Poupança',
    other: 'Outro',
  };
  const KINDS = { contribution: 'Aporte', redemption: 'Resgate', income: 'Provento' };
  let openId = null;

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

  function entryPanel(investment, redraw) {
    const kind = el(
      'select',
      {},
      ...Object.entries(KINDS).map(([value, label]) => el('option', { value }, label)),
    );
    const amount = el('input', {
      type: 'text',
      inputmode: 'decimal',
      placeholder: 'Valor (ex.: 100,00)',
      required: true,
    });
    const date = el('input', { type: 'date', value: money.todayISO(), required: true });
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

    const form = el(
      'form',
      {
        class: 'form',
        onsubmit: async (event) => {
          event.preventDefault();
          error.hidden = true;
          const cents = money.parseMoney(amount.value);
          if (!cents) {
            error.textContent = 'Informe um valor válido, como 100,00';
            error.hidden = false;
            return;
          }
          const cotas = quantity.value.trim()
            ? Number(quantity.value.replace(',', '.'))
            : undefined;
          try {
            await api('/investments/' + investment._id + '/entries', {
              method: 'POST',
              body: {
                kind: kind.value,
                amount: cents,
                date: money.toApiDate(date.value),
                quantity: Number.isFinite(cotas) ? cotas : undefined,
                notes: notes.value,
              },
            });
            await redraw();
          } catch (err) {
            showError(error, err);
          }
        },
      },
      kind,
      amount,
      date,
      quantity,
      notes,
      el('button', { class: 'btn primary', type: 'submit' }, 'Registrar'),
      error,
    );

    const history = [...investment.entries]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((entry) =>
        el(
          'li',
          { class: 'tx' },
          el(
            'div',
            { class: 'tx-main' },
            el('strong', {}, KINDS[entry.kind]),
            el(
              'span',
              { class: 'muted' },
              [
                money.formatDate(entry.date),
                entry.quantity ? entry.quantity + ' cotas' : '',
                entry.notes,
              ]
                .filter(Boolean)
                .join(' · '),
            ),
          ),
          el(
            'span',
            { class: 'amount ' + (entry.kind === 'redemption' ? 'expense' : 'income') },
            fmt(entry.amount),
          ),
          el(
            'button',
            {
              class: 'btn small danger',
              type: 'button',
              onclick: async () => {
                if (confirm('Remover esta movimentação?')) {
                  await api('/investments/' + investment._id + '/entries/' + entry._id, {
                    method: 'DELETE',
                  });
                  await redraw();
                }
              },
            },
            'Remover',
          ),
        ),
      );

    return el(
      'div',
      {},
      form,
      history.length
        ? el('ul', { class: 'list' }, ...history)
        : el('p', { class: 'muted' }, 'Sem movimentações ainda.'),
    );
  }

  const DAILY_TYPES = ['treasury', 'reserve', 'fund', 'other'];
  const HINTS = {
    cdb: 'Informe a taxa anual do CDB (ex.: 11,5). O sistema calcula quanto rende por dia, semana, mês e ano.',
    treasury:
      'Informe a taxa anual. Se não souber (Tesouro Selic, por exemplo), informe quanto ele rende por dia útil: o sistema calcula semana, mês e ano.',
    fii: 'O rendimento vem dos proventos que você registrar (dividendos). Informe as cotas em cada aporte. Se quiser, estime também com uma taxa anual.',
    stock:
      'O rendimento vem dos proventos que você registrar (dividendos e JCP). Informe as cotas em cada aporte. Se quiser, estime também com uma taxa anual.',
    fund: 'Informe a taxa anual ou quanto rende por dia útil. Sem nenhum dos dois, vale a média dos proventos recebidos.',
    savings:
      'Informe a taxa anual da poupança. O sistema calcula quanto rende por dia, semana, mês e ano.',
    reserve: 'Informe a taxa anual ou quanto o cofrinho rende por dia útil.',
    other: 'Informe a taxa anual ou quanto rende por dia útil.',
  };
  const METHOD_LABELS = {
    rate: 'pela taxa informada',
    daily: 'pelo ganho por dia útil',
    income: 'pelos proventos (12 meses)',
  };

  const pct = (value) => value.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';

  // Nome, tipo, dono e, quando há cotas, quantidade e preço médio.
  function nameCell(investment) {
    const details = [TYPES[investment.type]];
    if (investment.personName) {
      details.push('de ' + investment.personName);
    }
    const { quantity, averagePrice } = investment.position;
    if (quantity > 0) {
      details.push(quantity.toLocaleString('pt-BR') + ' cotas');
      if (averagePrice) {
        details.push('preço médio ' + fmt(averagePrice));
      }
    }
    return el(
      'td',
      {},
      el('strong', {}, investment.name),
      el('div', { class: 'muted' }, details.join(' · ')),
    );
  }

  // Taxa ao ano e de onde ela vem (informada, ganho por dia ou proventos).
  function rateCell(investment) {
    const { method, annualRate } = investment.estimate;
    return el(
      'td',
      { class: 'num' },
      pct(annualRate),
      el('div', { class: 'muted' }, METHOD_LABELS[method]),
    );
  }

  async function render(container) {
    let items;
    let summary;
    try {
      [items, summary] = await Promise.all([api('/investments'), api('/investments/summary')]);
    } catch (err) {
      container.replaceChildren(el('p', { class: 'error' }, err.message));
      return;
    }
    const redraw = () => render(container);

    const owners = [...new Set(items.map((item) => item.personName).filter(Boolean))];
    const name = el('input', {
      type: 'text',
      placeholder: 'Nome (ex.: CDB banco X, MXRF11)',
      required: true,
      maxlength: 80,
    });
    const type = el(
      'select',
      {},
      ...Object.entries(TYPES).map(([value, label]) => el('option', { value }, label)),
    );
    const rate = el('input', {
      type: 'text',
      inputmode: 'decimal',
      placeholder: 'Taxa anual (% a.a.)',
    });
    const daily = el('input', {
      type: 'text',
      inputmode: 'decimal',
      placeholder: 'Ganho por dia útil (R$)',
    });
    const person = el('input', {
      type: 'text',
      maxlength: 60,
      placeholder: 'De quem é? (vazio = meu)',
      list: 'cf-donos',
    });
    const ownersList = el(
      'datalist',
      { id: 'cf-donos' },
      ...owners.map((n) => el('option', { value: n })),
    );
    const hint = el('p', { class: 'muted full' });
    const error = el('p', { class: 'error', role: 'alert', hidden: true });

    // Cada tipo mostra só os campos que fazem sentido e explica como o rendimento é calculado.
    function syncFields() {
      daily.hidden = !DAILY_TYPES.includes(type.value);
      hint.textContent = HINTS[type.value];
    }
    type.addEventListener('change', syncFields);
    syncFields();

    const form = el(
      'form',
      {
        class: 'card form',
        onsubmit: async (event) => {
          event.preventDefault();
          error.hidden = true;
          const annualRate = rate.value.trim() ? Number(rate.value.replace(',', '.')) : 0;
          if (!Number.isFinite(annualRate) || annualRate < 0) {
            error.textContent = 'Informe uma taxa anual válida, como 10 ou 12,5';
            error.hidden = false;
            return;
          }
          const dailyGain = !daily.hidden && daily.value.trim() ? money.parseMoney(daily.value) : 0;
          if (dailyGain === null) {
            error.textContent = 'Informe o ganho por dia como valor, por exemplo 1,25';
            error.hidden = false;
            return;
          }
          try {
            await api('/investments', {
              method: 'POST',
              body: {
                name: name.value,
                type: type.value,
                annualRate,
                dailyGain: dailyGain || 0,
                personName: person.value,
              },
            });
            await redraw();
          } catch (err) {
            showError(error, err);
          }
        },
      },
      el('h2', {}, 'Novo investimento'),
      name,
      type,
      hint,
      rate,
      daily,
      person,
      ownersList,
      el('button', { class: 'btn primary full', type: 'submit' }, 'Cadastrar'),
      error,
    );

    const rows = items.flatMap((investment) => {
      const row = el(
        'tr',
        {},
        nameCell(investment),
        rateCell(investment),
        el('td', { class: 'num' }, fmt(investment.position.balance)),
        el('td', { class: 'num income' }, fmt(investment.position.received)),
        el('td', { class: 'num' }, fmt(investment.yields.monthly)),
        el(
          'td',
          { class: 'num' },
          el(
            'div',
            { class: 'actions' },
            el(
              'button',
              {
                class: 'btn small',
                type: 'button',
                onclick: () => {
                  openId = openId === investment._id ? null : investment._id;
                  redraw();
                },
              },
              openId === investment._id ? 'Fechar' : 'Movimentar',
            ),
            el(
              'button',
              {
                class: 'btn small',
                type: 'button',
                onclick: () => {
                  window.CF.simDefaults = {
                    initialCents: investment.position.balance,
                    annualPercent: investment.estimate.annualRate,
                  };
                  location.hash = '#/simulator';
                },
              },
              'Simular',
            ),
            el(
              'button',
              {
                class: 'btn small danger',
                type: 'button',
                onclick: async () => {
                  if (confirm('Excluir "' + investment.name + '" e o histórico dele?')) {
                    await api('/investments/' + investment._id, { method: 'DELETE' });
                    await redraw();
                  }
                },
              },
              'Excluir',
            ),
          ),
        ),
      );
      return openId === investment._id
        ? [row, el('tr', {}, el('td', { colspan: 6 }, entryPanel(investment, redraw)))]
        : [row];
    });

    container.replaceChildren(
      el(
        'section',
        { class: 'card' },
        el('h2', {}, 'Minha carteira'),
        el(
          'div',
          { class: 'stats' },
          stat('Total aplicado', fmt(summary.balance), ''),
          stat('Total recebido', fmt(summary.received), 'income'),
          stat('Rendimento por dia', fmt(summary.yields.daily), 'investment'),
          stat('Rendimento por semana', fmt(summary.yields.weekly), 'investment'),
          stat('Rendimento por mês', fmt(summary.yields.monthly), 'investment'),
        ),
        el(
          'p',
          { class: 'muted' },
          'Rendimentos estimados, sem impostos. CDB, poupança e Tesouro usam a taxa anual; quando você informa o ganho por dia útil, ele vale mais que a taxa; ações e fundos imobiliários usam o que pagaram de proventos nos últimos 12 meses. Total recebido = proventos + ganho dos resgates.',
        ),
      ),
      form,
      el(
        'section',
        { class: 'card' },
        el('h2', {}, 'Investimentos'),
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
                    el('th', {}, 'Nome'),
                    el('th', { class: 'num' }, 'Taxa'),
                    el('th', { class: 'num' }, 'Aplicado'),
                    el('th', { class: 'num' }, 'Recebido'),
                    el('th', { class: 'num' }, 'Rend./mês'),
                    el('th', {}),
                  ),
                ),
                el('tbody', {}, rows),
              ),
            )
          : el('p', { class: 'muted' }, 'Nenhum investimento cadastrado.'),
      ),
    );
  }

  (window.CF.views = window.CF.views || {}).investments = {
    title: 'Investimentos',
    order: 40,
    render,
  };
})();
