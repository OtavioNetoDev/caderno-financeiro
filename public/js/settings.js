(function () {
  const { el, api, money } = window.CF;
  const ACCOUNT_TYPES = {
    cash: 'Dinheiro',
    checking: 'Conta corrente',
    savings: 'Poupança',
    wallet: 'Carteira digital',
    reserve: 'Cofrinho/reserva',
  };
  const KINDS = { expense: 'Despesas', income: 'Receitas', investment: 'Investimentos' };

  function showError(node, err) {
    node.textContent = [err.message, ...(err.details || [])].join(' · ');
    node.hidden = false;
  }

  function accountsCard(state, refresh) {
    const name = el('input', {
      type: 'text',
      placeholder: 'Nome da conta (ex.: Pix)',
      required: true,
      maxlength: 60,
    });
    const type = el(
      'select',
      {},
      ...Object.entries(ACCOUNT_TYPES).map(([value, label]) => el('option', { value }, label)),
    );
    const balance = el('input', {
      type: 'text',
      inputmode: 'decimal',
      placeholder: 'Saldo inicial (opcional)',
    });
    const error = el('p', { class: 'error', role: 'alert', hidden: true });

    const form = el(
      'form',
      {
        class: 'form',
        onsubmit: async (event) => {
          event.preventDefault();
          error.hidden = true;
          const cents = balance.value.trim() ? money.parseMoney(balance.value) : 0;
          if (cents === null) {
            error.textContent = 'Saldo inicial inválido';
            error.hidden = false;
            return;
          }
          try {
            await api('/accounts', {
              method: 'POST',
              body: { name: name.value, type: type.value, initialBalance: cents },
            });
            await refresh();
          } catch (err) {
            showError(error, err);
          }
        },
      },
      name,
      type,
      balance,
      el('button', { class: 'btn primary', type: 'submit' }, 'Adicionar conta'),
      error,
    );

    const rows = state.accounts.map((account) =>
      el(
        'tr',
        {},
        el('td', {}, account.name),
        el('td', {}, ACCOUNT_TYPES[account.type] || account.type),
        el('td', { class: 'num' }, money.formatMoney(account.initialBalance)),
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
                onclick: async () => {
                  const next = prompt('Novo nome da conta', account.name);
                  if (next && next.trim()) {
                    await api('/accounts/' + account._id, {
                      method: 'PATCH',
                      body: { name: next.trim() },
                    });
                    await refresh();
                  }
                },
              },
              'Renomear',
            ),
            el(
              'button',
              {
                class: 'btn small danger',
                type: 'button',
                onclick: async () => {
                  if (confirm('Arquivar esta conta? Os lançamentos antigos continuam salvos.')) {
                    await api('/accounts/' + account._id, {
                      method: 'PATCH',
                      body: { archived: true },
                    });
                    await refresh();
                  }
                },
              },
              'Arquivar',
            ),
          ),
        ),
      ),
    );

    return el(
      'section',
      { class: 'card' },
      el('h2', {}, 'Contas e carteiras'),
      form,
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
              el('th', {}, 'Nome'),
              el('th', {}, 'Tipo'),
              el('th', { class: 'num' }, 'Saldo inicial'),
              el('th', {}),
            ),
          ),
          el('tbody', {}, rows),
        ),
      ),
    );
  }

  function categoriesCard(state, refresh) {
    const name = el('input', {
      type: 'text',
      placeholder: 'Nome da categoria',
      required: true,
      maxlength: 60,
    });
    const kind = el(
      'select',
      {},
      ...Object.entries(KINDS).map(([value, label]) => el('option', { value }, label)),
    );
    const color = el('input', { type: 'color', value: '#6b7280', 'aria-label': 'Cor' });
    const error = el('p', { class: 'error', role: 'alert', hidden: true });

    const form = el(
      'form',
      {
        class: 'form',
        onsubmit: async (event) => {
          event.preventDefault();
          error.hidden = true;
          try {
            await api('/categories', {
              method: 'POST',
              body: { name: name.value, kind: kind.value, color: color.value },
            });
            await refresh();
          } catch (err) {
            showError(error, err);
          }
        },
      },
      name,
      kind,
      color,
      el('button', { class: 'btn primary', type: 'submit' }, 'Adicionar categoria'),
      error,
    );

    const groups = Object.entries(KINDS).map(([value, label]) =>
      el(
        'div',
        {},
        el('h2', {}, label),
        el(
          'ul',
          { class: 'list' },
          ...state.categories
            .filter((category) => category.kind === value)
            .map((category) =>
              el(
                'li',
                { class: 'tx' },
                el(
                  'span',
                  {},
                  el('span', { class: 'swatch', style: 'background:' + category.color }),
                  category.name,
                ),
                el(
                  'button',
                  {
                    class: 'btn small danger',
                    type: 'button',
                    onclick: async () => {
                      if (
                        confirm(
                          'Excluir a categoria "' +
                            category.name +
                            '"? Os lançamentos antigos continuam salvos.',
                        )
                      ) {
                        await api('/categories/' + category._id, { method: 'DELETE' });
                        await refresh();
                      }
                    },
                  },
                  'Excluir',
                ),
              ),
            ),
        ),
      ),
    );

    return el('section', { class: 'card' }, el('h2', {}, 'Categorias'), form, ...groups);
  }

  (window.CF.views = window.CF.views || {}).settings = {
    title: 'Cadastros',
    order: 90,
    render(container, state, refresh) {
      container.replaceChildren(accountsCard(state, refresh), categoriesCard(state, refresh));
    },
  };
})();
