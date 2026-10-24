(function () {
  const { el, api, money } = window.CF;
  const fmt = money.formatMoney;
  let selectedId = null;
  let month = money.currentMonth();

  const shift = (value, delta) => {
    const [year, mon] = value.split('-').map(Number);
    const index = year * 12 + (mon - 1) + delta;
    return Math.floor(index / 12) + '-' + String((index % 12) + 1).padStart(2, '0');
  };

  const monthLabel = (value) => {
    const [year, mon] = value.split('-').map(Number);
    return new Date(Date.UTC(year, mon - 1, 15)).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  };

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

  function cardForm(redraw) {
    const name = el('input', {
      type: 'text',
      placeholder: 'Nome do cartão (ex.: Mercado Pago)',
      required: true,
      maxlength: 60,
    });
    const closing = el('input', {
      type: 'number',
      min: 1,
      max: 28,
      placeholder: 'Dia do fechamento (1 a 28)',
      required: true,
    });
    const due = el('input', {
      type: 'number',
      min: 1,
      max: 28,
      placeholder: 'Dia do vencimento (1 a 28)',
      required: true,
    });
    const limit = el('input', {
      type: 'text',
      inputmode: 'decimal',
      placeholder: 'Limite (opcional)',
    });
    const error = el('p', { class: 'error', role: 'alert', hidden: true });

    return el(
      'form',
      {
        class: 'card form',
        onsubmit: async (event) => {
          event.preventDefault();
          error.hidden = true;
          const creditLimit = limit.value.trim() ? money.parseMoney(limit.value) : null;
          if (limit.value.trim() && creditLimit === null) {
            error.textContent = 'Limite inválido';
            error.hidden = false;
            return;
          }
          try {
            const card = await api('/cards', {
              method: 'POST',
              body: {
                name: name.value,
                closingDay: Number(closing.value),
                dueDay: Number(due.value),
                creditLimit,
              },
            });
            selectedId = card._id;
            await redraw();
          } catch (err) {
            showError(error, err);
          }
        },
      },
      el('h2', {}, 'Novo cartão'),
      name,
      closing,
      due,
      limit,
      el('button', { class: 'btn primary full', type: 'submit' }, 'Cadastrar cartão'),
      error,
    );
  }

  function chargeForm(card, state, redraw) {
    const description = el('input', {
      type: 'text',
      placeholder: 'Descrição (ex.: Óculos)',
      required: true,
      maxlength: 120,
    });
    const amount = el('input', {
      type: 'text',
      inputmode: 'decimal',
      placeholder: 'Valor total (ex.: 300,00)',
      required: true,
    });
    const installments = el('input', {
      type: 'number',
      min: 1,
      max: 48,
      value: '1',
      required: true,
      title: 'Parcelas',
      'aria-label': 'Parcelas',
    });
    const date = el('input', { type: 'date', value: money.todayISO(), required: true });
    const category = el(
      'select',
      {},
      el('option', { value: '' }, 'Sem categoria'),
      ...state.categories
        .filter((item) => item.kind === 'expense')
        .map((item) => el('option', { value: item._id }, item.name)),
    );
    const person = el('input', { type: 'text', placeholder: 'Pessoa (opcional)', maxlength: 60 });
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
            error.textContent = 'Informe um valor válido, como 300,00';
            error.hidden = false;
            return;
          }
          try {
            await api('/cards/' + card._id + '/charges', {
              method: 'POST',
              body: {
                description: description.value,
                amount: cents,
                installments: Number(installments.value),
                purchaseDate: money.toApiDate(date.value),
                categoryId: category.value,
                personName: person.value,
              },
            });
            await redraw();
          } catch (err) {
            showError(error, err);
          }
        },
      },
      el('h2', {}, 'Nova compra no cartão'),
      description,
      amount,
      installments,
      date,
      category,
      person,
      el('button', { class: 'btn primary full', type: 'submit' }, 'Adicionar compra'),
      error,
    );
  }

  function invoiceCard(card, invoice, state, redraw, refresh) {
    const categoryNames = new Map(state.categories.map((item) => [item._id, item.name]));

    const billed = el('input', {
      type: 'text',
      inputmode: 'decimal',
      placeholder: 'Valor da fatura (ex.: 498,97)',
      value:
        invoice.billedTotal !== null
          ? (invoice.billedTotal / 100).toFixed(2).replace('.', ',')
          : null,
    });
    const billedError = el('p', { class: 'error', role: 'alert', hidden: true });
    const billedForm = el(
      'form',
      {
        class: 'form',
        onsubmit: async (event) => {
          event.preventDefault();
          billedError.hidden = true;
          const cents = billed.value.trim() ? money.parseMoney(billed.value) : null;
          if (billed.value.trim() && cents === null) {
            billedError.textContent = 'Valor inválido';
            billedError.hidden = false;
            return;
          }
          try {
            await api('/cards/' + card._id + '/invoices/' + month, {
              method: 'PUT',
              body: { billedTotal: cents },
            });
            await redraw();
          } catch (err) {
            showError(billedError, err);
          }
        },
      },
      billed,
      el('button', { class: 'btn small', type: 'submit' }, 'Salvar valor da fatura'),
      billedError,
    );

    const toPay = invoice.billedTotal !== null ? invoice.billedTotal : invoice.total;
    const payAccount = el(
      'select',
      {},
      ...state.accounts.map((item) => el('option', { value: item._id }, item.name)),
    );
    const payArea = invoice.paid
      ? el('p', { class: 'notice' }, 'Fatura paga: ' + fmt(invoice.paidAmount || 0) + '.')
      : el(
          'div',
          { class: 'actions' },
          payAccount,
          el(
            'button',
            {
              class: 'btn primary small',
              type: 'button',
              disabled: toPay <= 0,
              onclick: async () => {
                if (
                  !confirm(
                    'Pagar ' +
                      fmt(toPay) +
                      ' da fatura de ' +
                      monthLabel(month) +
                      '? Será criada uma despesa na conta escolhida.',
                  )
                ) {
                  return;
                }
                try {
                  await api('/cards/' + card._id + '/invoices/' + month + '/pay', {
                    method: 'POST',
                    body: { accountId: payAccount.value },
                  });
                  await refresh();
                } catch (err) {
                  alert(err.message);
                }
              },
            },
            'Pagar fatura',
          ),
        );

    const difference = invoice.difference;
    const dueText =
      String(invoice.dueDay).padStart(2, '0') +
      '/' +
      invoice.dueMonth.slice(5, 7) +
      '/' +
      invoice.dueMonth.slice(0, 4);

    const totals = new Map();
    for (const item of invoice.items) {
      const name = categoryNames.get(item.categoryId) || 'Sem categoria';
      totals.set(name, (totals.get(name) || 0) + item.amount);
    }
    const ranking = [...totals.entries()].sort((a, b) => b[1] - a[1]);
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
        el('strong', {}, fmt(total)),
      ),
    );

    const rows = invoice.items.map((item) =>
      el(
        'tr',
        {},
        el('td', {}, money.formatDate(item.purchaseDate)),
        el(
          'td',
          {},
          item.description,
          item.personName && el('div', { class: 'muted' }, item.personName),
        ),
        el('td', {}, categoryNames.get(item.categoryId) || '—'),
        el('td', {}, item.of > 1 ? item.number + '/' + item.of : 'à vista'),
        el('td', { class: 'num' }, fmt(item.amount)),
        el(
          'td',
          { class: 'num' },
          el(
            'button',
            {
              class: 'btn small danger',
              type: 'button',
              onclick: async () => {
                if (confirm('Excluir a compra inteira (todas as parcelas)?')) {
                  await api('/cards/' + card._id + '/charges/' + item.chargeId, {
                    method: 'DELETE',
                  });
                  await redraw();
                }
              },
            },
            'Excluir',
          ),
        ),
      ),
    );

    return el(
      'section',
      { class: 'card stack' },
      el(
        'div',
        { class: 'page-head' },
        el('h2', {}, card.name + ' · fatura de ' + monthLabel(month)),
        el(
          'div',
          { class: 'actions' },
          el(
            'button',
            {
              class: 'btn small',
              type: 'button',
              onclick: () => {
                month = shift(month, -1);
                redraw();
              },
            },
            '‹ Anterior',
          ),
          el(
            'button',
            {
              class: 'btn small',
              type: 'button',
              onclick: () => {
                month = shift(month, 1);
                redraw();
              },
            },
            'Próxima ›',
          ),
        ),
      ),
      el(
        'div',
        { class: 'stats' },
        stat('Total calculado', fmt(invoice.total), ''),
        stat('Valor da fatura', invoice.billedTotal !== null ? fmt(invoice.billedTotal) : '—', ''),
        stat(
          'Diferença (fatura − cálculo)',
          difference === null
            ? '—'
            : (difference > 0 ? '+ ' : difference < 0 ? '− ' : '') + fmt(Math.abs(difference)),
          difference ? 'expense' : '',
        ),
        stat('Vencimento', dueText, ''),
      ),
      billedForm,
      payArea,
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
                  el('th', {}, 'Data'),
                  el('th', {}, 'Compra'),
                  el('th', {}, 'Categoria'),
                  el('th', {}, 'Parcela'),
                  el('th', { class: 'num' }, 'Valor'),
                  el('th', {}),
                ),
              ),
              el('tbody', {}, rows),
            ),
          )
        : el('p', { class: 'muted' }, 'Nenhuma compra nesta fatura.'),
      bars.length ? el('div', {}, el('h2', {}, 'Por categoria'), ...bars) : null,
      el(
        'div',
        { class: 'actions' },
        el(
          'button',
          {
            class: 'btn small',
            type: 'button',
            onclick: async () => {
              const closing = prompt('Dia de fechamento (1 a 28)', card.closingDay);
              if (closing === null) return;
              const due = prompt('Dia de vencimento (1 a 28)', card.dueDay);
              if (due === null) return;
              try {
                await api('/cards/' + card._id, {
                  method: 'PATCH',
                  body: { closingDay: Number(closing), dueDay: Number(due) },
                });
                await redraw();
              } catch (err) {
                alert(err.message);
              }
            },
          },
          'Alterar fechamento e vencimento',
        ),
        el(
          'button',
          {
            class: 'btn small danger',
            type: 'button',
            onclick: async () => {
              if (confirm('Arquivar o cartão "' + card.name + '"?')) {
                await api('/cards/' + card._id, { method: 'PATCH', body: { archived: true } });
                await redraw();
              }
            },
          },
          'Arquivar cartão',
        ),
      ),
    );
  }

  async function render(container, state, refresh) {
    let cards;
    try {
      cards = await api('/cards');
    } catch (err) {
      container.replaceChildren(el('p', { class: 'error' }, err.message));
      return;
    }
    if (!cards.some((card) => card._id === selectedId)) {
      selectedId = cards[0] ? cards[0]._id : null;
    }
    const card = cards.find((item) => item._id === selectedId) || null;
    const redraw = () => render(container, state, refresh);

    let invoice = null;
    if (card) {
      try {
        invoice = await api('/cards/' + card._id + '/invoices/' + month);
      } catch (err) {
        container.replaceChildren(el('p', { class: 'error' }, err.message));
        return;
      }
    }

    const tabs = cards.map((item) =>
      el(
        'button',
        {
          class: 'btn small' + (item._id === selectedId ? ' primary' : ''),
          type: 'button',
          onclick: () => {
            selectedId = item._id;
            redraw();
          },
        },
        item.name,
      ),
    );

    container.replaceChildren(
      el(
        'section',
        { class: 'card page-head' },
        el('h2', {}, 'Cartões de crédito'),
        el('div', { class: 'actions' }, ...tabs),
      ),
      ...(card
        ? [invoiceCard(card, invoice, state, redraw, refresh), chargeForm(card, state, redraw)]
        : [el('p', { class: 'notice' }, 'Cadastre um cartão para começar.')]),
      cardForm(redraw),
    );
  }

  (window.CF.views = window.CF.views || {}).cards = { title: 'Cartões', order: 35, render };
})();
