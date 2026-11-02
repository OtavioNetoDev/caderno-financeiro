(function () {
  const CF = window.CF;
  const { el, api, money } = CF;
  const fmt = money.formatMoney;

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

  const query = (range) =>
    '?from=' + encodeURIComponent(range.from) + '&to=' + encodeURIComponent(range.to);

  function summaryCard(monthReport, yearReport) {
    return el(
      'section',
      { class: 'card stack' },
      el('h2', {}, 'Proventos recebidos'),
      el(
        'p',
        { class: 'muted' },
        'Dinheiro que os investimentos pagam (dividendos, juros, rendimentos). Fica separado das receitas e não entra no lucro do mês.',
      ),
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
        el('h2', {}, 'Registrar provento'),
        el(
          'p',
          { class: 'muted' },
          'Cadastre um investimento na tela Investimentos para poder registrar proventos.',
        ),
      );
    }
    const asset = el(
      'select',
      { 'aria-label': 'Investimento' },
      ...investments.map((item) => el('option', { value: item._id }, item.name)),
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
      el('h2', {}, 'Registrar provento'),
      asset,
      amount,
      date,
      quantity,
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
              if (confirm('Remover este provento?')) {
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
      el('h2', {}, 'Proventos do mês'),
      rows.length
        ? el('ul', { class: 'list' }, ...rows)
        : el('p', { class: 'muted' }, 'Nenhum provento registrado neste mês.'),
    );
  }

  async function render(container, state, reload) {
    let investments;
    let monthReport;
    let yearReport;
    try {
      const months = lastMonths(state.month, 12);
      const monthRange = money.monthRange(state.month);
      const yearRange = { from: money.monthRange(months[0]).from, to: monthRange.to };
      [investments, monthReport, yearReport] = await Promise.all([
        api('/investments'),
        api('/investments/income' + query(monthRange)),
        api('/investments/income' + query(yearRange)),
      ]);
    } catch (err) {
      container.replaceChildren(el('p', { class: 'error' }, err.message));
      return;
    }

    const summary = summaryCard(monthReport, yearReport);
    const form = entryForm(investments, state, reload);
    const list = listCard(monthReport, reload);
    const sections = [summary, form, list];
    container.replaceChildren(...sections);
  }

  (CF.views = CF.views || {}).proventos = {
    title: 'Proventos',
    order: 45,
    monthly: true,
    render,
  };
})();
