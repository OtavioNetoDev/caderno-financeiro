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
      placeholder: 'Taxa anual estimada (% a.a.)',
      value: '10',
    });
    const error = el('p', { class: 'error', role: 'alert', hidden: true });

    const form = el(
      'form',
      {
        class: 'card form',
        onsubmit: async (event) => {
          event.preventDefault();
          error.hidden = true;
          const annualRate = Number(rate.value.replace(',', '.'));
          if (!Number.isFinite(annualRate) || annualRate < 0) {
            error.textContent = 'Informe uma taxa anual válida, como 10 ou 12,5';
            error.hidden = false;
            return;
          }
          try {
            await api('/investments', {
              method: 'POST',
              body: { name: name.value, type: type.value, annualRate },
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
      rate,
      el('button', { class: 'btn primary full', type: 'submit' }, 'Cadastrar'),
      error,
    );

    const rows = items.flatMap((investment) => {
      const row = el(
        'tr',
        {},
        el(
          'td',
          {},
          el('strong', {}, investment.name),
          el('div', { class: 'muted' }, TYPES[investment.type]),
        ),
        el('td', { class: 'num' }, investment.annualRate.toLocaleString('pt-BR') + '%'),
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
                    annualPercent: investment.annualRate,
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
          'Rendimentos estimados a partir da taxa anual informada (juros compostos), sem impostos. Total recebido = proventos + ganho dos resgates.',
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
