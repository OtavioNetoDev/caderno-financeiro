(function () {
  const { el, api, money } = window.CF;
  const fmt = money.formatMoney;
  const LEVEL_CLASS = { ok: '', warning: ' warn', exceeded: ' over' };
  const LEVEL_TEXT = {
    ok: 'Dentro da meta',
    warning: 'Perto do limite',
    exceeded: 'Meta estourada',
  };

  async function render(container, state, refresh) {
    let items;
    try {
      items = await api('/budgets/status?month=' + state.month);
    } catch (err) {
      container.replaceChildren(el('p', { class: 'error' }, err.message));
      return;
    }

    const category = el(
      'select',
      {},
      ...state.categories
        .filter((item) => item.kind === 'expense')
        .map((item) => el('option', { value: item._id }, item.name)),
    );
    const limit = el('input', {
      type: 'text',
      inputmode: 'decimal',
      placeholder: 'Meta mensal (ex.: 100,00)',
      required: true,
    });
    const error = el('p', { class: 'error', role: 'alert', hidden: true });

    const form = el(
      'form',
      {
        class: 'card form',
        onsubmit: async (event) => {
          event.preventDefault();
          error.hidden = true;
          const cents = money.parseMoney(limit.value);
          if (!cents) {
            error.textContent = 'Informe um valor válido, como 100,00';
            error.hidden = false;
            return;
          }
          try {
            await api('/budgets/' + category.value, {
              method: 'PUT',
              body: { limitAmount: cents },
            });
            await refresh();
          } catch (err) {
            error.textContent = [err.message, ...(err.details || [])].join(' · ');
            error.hidden = false;
          }
        },
      },
      el('h2', {}, 'Definir meta mensal'),
      category,
      limit,
      el('button', { class: 'btn primary', type: 'submit' }, 'Salvar meta'),
      error,
    );

    const alerts = items
      .filter((item) => item.level !== 'ok')
      .map((item) =>
        el(
          'p',
          { class: 'notice' },
          item.categoryName +
            ': ' +
            item.percent +
            '% da meta usada (' +
            fmt(item.spent) +
            ' de ' +
            fmt(item.limitAmount) +
            ').',
        ),
      );

    const rows = items.map((item) =>
      el(
        'li',
        { class: 'tx' },
        el(
          'div',
          { class: 'tx-main', style: 'flex:1' },
          el('strong', {}, item.categoryName),
          el(
            'div',
            { class: 'progress' + LEVEL_CLASS[item.level] },
            el('div', { style: 'width:' + Math.min(item.percent, 100) + '%' }),
          ),
          el(
            'span',
            { class: 'muted' },
            fmt(item.spent) +
              ' de ' +
              fmt(item.limitAmount) +
              ' · ' +
              (item.remaining >= 0
                ? 'restam ' + fmt(item.remaining)
                : 'passou ' + fmt(-item.remaining)),
          ),
        ),
        el('span', { class: 'badge' }, LEVEL_TEXT[item.level]),
        el(
          'div',
          { class: 'actions' },
          el(
            'button',
            {
              class: 'btn small',
              type: 'button',
              onclick: async () => {
                const next = prompt(
                  'Nova meta mensal (ex.: 150,00)',
                  (item.limitAmount / 100).toFixed(2).replace('.', ','),
                );
                const cents = next === null ? null : money.parseMoney(next);
                if (cents) {
                  await api('/budgets/' + item.categoryId, {
                    method: 'PUT',
                    body: { limitAmount: cents },
                  });
                  await refresh();
                }
              },
            },
            'Alterar',
          ),
          el(
            'button',
            {
              class: 'btn small danger',
              type: 'button',
              onclick: async () => {
                if (confirm('Remover a meta de "' + item.categoryName + '"?')) {
                  await api('/budgets/' + item.categoryId, { method: 'DELETE' });
                  await refresh();
                }
              },
            },
            'Remover',
          ),
        ),
      ),
    );

    container.replaceChildren(
      ...alerts,
      form,
      el(
        'section',
        { class: 'card' },
        el('h2', {}, 'Metas do mês'),
        rows.length
          ? el('ul', { class: 'list' }, ...rows)
          : el(
              'p',
              { class: 'muted' },
              'Nenhuma meta definida. Que tal começar pela categoria Lanche?',
            ),
        el(
          'p',
          { class: 'muted' },
          'Contam só despesas confirmadas e com categoria. Pagamentos de fatura de cartão entram como uma despesa única.',
        ),
      ),
    );
  }

  (window.CF.views = window.CF.views || {}).budgets = {
    title: 'Metas',
    order: 45,
    monthly: true,
    render,
  };
})();
