(function () {
  const { el, api, money } = window.CF;
  const DIRECTION = { receivable: 'A receber', payable: 'A pagar' };
  const ENTRY = { payment: 'Pagamento', increase: 'Aumento' };
  let openId = null;

  const sum = (entries, kind) =>
    entries
      .filter((entry) => entry.kind === kind)
      .reduce((total, entry) => total + entry.amount, 0);

  function showError(node, err) {
    node.textContent = [err.message, ...(err.details || [])].join(' · ');
    node.hidden = false;
  }

  function entryPanel(debt, redraw) {
    const kind = el(
      'select',
      {},
      ...Object.entries(ENTRY).map(([value, label]) => el('option', { value }, label)),
    );
    const amount = el('input', {
      type: 'text',
      inputmode: 'decimal',
      placeholder: 'Valor (ex.: 150,00)',
      required: true,
    });
    const date = el('input', { type: 'date', value: money.todayISO(), required: true });
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
            error.textContent = 'Informe um valor válido, como 150,00';
            error.hidden = false;
            return;
          }
          try {
            await api('/debts/' + debt._id + '/entries', {
              method: 'POST',
              body: {
                kind: kind.value,
                amount: cents,
                date: money.toApiDate(date.value),
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
      notes,
      el('button', { class: 'btn primary', type: 'submit' }, 'Registrar'),
      error,
    );

    const history = [...debt.entries]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .map((entry) =>
        el(
          'li',
          { class: 'tx' },
          el(
            'div',
            { class: 'tx-main' },
            el('strong', {}, ENTRY[entry.kind]),
            el(
              'span',
              { class: 'muted' },
              [money.formatDate(entry.date), entry.notes].filter(Boolean).join(' · '),
            ),
          ),
          el(
            'span',
            { class: 'amount ' + (entry.kind === 'payment' ? 'income' : 'expense') },
            (entry.kind === 'payment' ? '− ' : '+ ') + money.formatMoney(entry.amount),
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

  async function render(container, state) {
    let debts;
    let summary;
    try {
      [debts, summary] = await Promise.all([api('/debts'), api('/debts/summary')]);
    } catch (err) {
      container.replaceChildren(el('p', { class: 'error' }, err.message));
      return;
    }
    const redraw = () => render(container, state);

    const person = el('input', {
      type: 'text',
      placeholder: 'Pessoa',
      required: true,
      maxlength: 60,
    });
    const direction = el(
      'select',
      {},
      el('option', { value: 'receivable' }, 'Alguém me deve (a receber)'),
      el('option', { value: 'payable' }, 'Eu devo (a pagar)'),
    );
    const amount = el('input', {
      type: 'text',
      inputmode: 'decimal',
      placeholder: 'Valor (ex.: 1.500,00)',
      required: true,
    });
    const due = el('input', {
      type: 'date',
      title: 'Vencimento (opcional)',
      'aria-label': 'Vencimento (opcional)',
    });
    const notes = el('input', { type: 'text', placeholder: 'Observações', maxlength: 300 });
    const error = el('p', { class: 'error', role: 'alert', hidden: true });

    const form = el(
      'form',
      {
        class: 'card form',
        onsubmit: async (event) => {
          event.preventDefault();
          error.hidden = true;
          const cents = money.parseMoney(amount.value);
          if (!cents) {
            error.textContent = 'Informe um valor válido, como 1.500,00';
            error.hidden = false;
            return;
          }
          try {
            await api('/debts', {
              method: 'POST',
              body: {
                personName: person.value,
                direction: direction.value,
                originalAmount: cents,
                dueDate: due.value ? money.toApiDate(due.value) : undefined,
                notes: notes.value,
              },
            });
            await redraw();
          } catch (err) {
            showError(error, err);
          }
        },
      },
      el('h2', {}, 'Nova dívida'),
      person,
      direction,
      amount,
      due,
      notes,
      el('button', { class: 'btn primary full', type: 'submit' }, 'Cadastrar'),
      error,
    );

    const stat = (label, value, cls) =>
      el(
        'div',
        { class: 'stat' },
        el('span', { class: 'muted' }, label),
        el('strong', { class: cls }, value),
      );

    const rows = debts.flatMap((debt) => {
      const total = debt.originalAmount + sum(debt.entries, 'increase');
      const percent = total ? Math.round((sum(debt.entries, 'payment') / total) * 100) : 0;
      const tone = debt.direction === 'receivable' ? 'income' : 'expense';

      const row = el(
        'tr',
        {},
        el(
          'td',
          {},
          el('strong', {}, debt.personName),
          debt.notes && el('div', { class: 'muted' }, debt.notes),
        ),
        el(
          'td',
          {},
          el(
            'span',
            { class: 'badge' },
            debt.status === 'settled' ? 'quitada' : DIRECTION[debt.direction],
          ),
        ),
        el('td', { class: 'num' }, money.formatMoney(debt.originalAmount)),
        el('td', { class: 'num ' + tone }, money.formatMoney(debt.balance)),
        el(
          'td',
          {},
          el('div', { class: 'progress' }, el('div', { style: 'width:' + percent + '%' })),
          el('span', { class: 'muted' }, percent + '% pago'),
        ),
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
                  openId = openId === debt._id ? null : debt._id;
                  redraw();
                },
              },
              openId === debt._id ? 'Fechar' : 'Movimentar',
            ),
            el(
              'button',
              {
                class: 'btn small danger',
                type: 'button',
                onclick: async () => {
                  if (confirm('Excluir a dívida de ' + debt.personName + '?')) {
                    await api('/debts/' + debt._id, { method: 'DELETE' });
                    await redraw();
                  }
                },
              },
              'Excluir',
            ),
          ),
        ),
      );
      return openId === debt._id
        ? [row, el('tr', {}, el('td', { colspan: 6 }, entryPanel(debt, redraw)))]
        : [row];
    });

    container.replaceChildren(
      el(
        'section',
        { class: 'card' },
        el('h2', {}, 'Resumo das dívidas abertas'),
        el(
          'div',
          { class: 'stats' },
          stat('A receber', money.formatMoney(summary.receivable), 'income'),
          stat('A pagar', money.formatMoney(summary.payable), 'expense'),
          stat(
            'Saldo líquido',
            money.formatMoney(summary.net),
            summary.net < 0 ? 'expense' : 'income',
          ),
          stat('Dívidas abertas', String(summary.openCount), ''),
        ),
      ),
      form,
      el(
        'section',
        { class: 'card' },
        el('h2', {}, 'Dívidas'),
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
                    el('th', {}, 'Pessoa'),
                    el('th', {}, 'Tipo'),
                    el('th', { class: 'num' }, 'Original'),
                    el('th', { class: 'num' }, 'Saldo'),
                    el('th', {}, 'Progresso'),
                    el('th', {}),
                  ),
                ),
                el('tbody', {}, rows),
              ),
            )
          : el('p', { class: 'muted' }, 'Nenhuma dívida cadastrada.'),
      ),
    );
  }

  (window.CF.views = window.CF.views || {}).debts = { title: 'Dívidas', order: 30, render };
})();
