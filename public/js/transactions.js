(function () {
  const { el, api, money } = window.CF;
  const TYPE_LABEL = {
    expense: 'Despesa',
    income: 'Receita',
    investment: 'Investimento',
    transfer: 'Transferência',
  };
  const SIGN = { income: '+ ', expense: '− ', investment: '' };
  const dayOf = (iso) => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Bahia' });
  let editingId = null;

  window.CF.renderTransactions = function renderTransactions(container, state, reload) {
    const current = state.transactions.find((item) => item._id === editingId) || null;
    if (!current) {
      editingId = null;
    }
    const start = current || {};

    const type = el(
      'select',
      {},
      ...Object.entries(TYPE_LABEL).map(([value, label]) => el('option', { value }, label)),
    );
    type.value = start.type || 'expense';
    const amount = el('input', {
      type: 'text',
      inputmode: 'decimal',
      placeholder: 'Valor (ex.: 12,50)',
      required: true,
      value: current ? (current.amount / 100).toFixed(2).replace('.', ',') : null,
    });
    const description = el('input', {
      type: 'text',
      placeholder: 'Descrição (ex.: lanche)',
      maxlength: 200,
      value: start.description || null,
    });
    const category = el('select', {});
    const account = el(
      'select',
      {},
      ...state.accounts.map((item) => el('option', { value: item._id }, item.name)),
    );
    account.value = start.accountId || (state.accounts[0] ? state.accounts[0]._id : '');
    const toAccount = el(
      'select',
      {},
      ...state.accounts.map((item) => el('option', { value: item._id }, item.name)),
    );
    const otherAccount = state.accounts.find((item) => item._id !== account.value);
    toAccount.value = start.toAccountId || (otherAccount ? otherAccount._id : '');
    const toBox = el('div', {}, el('span', { class: 'muted' }, 'Conta de destino'), toAccount);
    const date = el('input', {
      type: 'date',
      value: current ? dayOf(current.date) : money.todayISO(),
      required: true,
    });
    const share = el(
      'select',
      {},
      el('option', { value: '' }, 'Só eu'),
      el('option', { value: 'with' }, 'Com outra pessoa (ambos consumiram)'),
      el('option', { value: 'for' }, 'Só para a outra pessoa'),
    );
    share.value = start.shareMode || '';
    const person = el('input', {
      type: 'text',
      placeholder: 'Pessoa (ex.: Raisa)',
      maxlength: 60,
      value: start.personName || null,
    });
    // Transferência não tem categoria nem pessoa; mostra a conta de destino.
    function syncVisibility() {
      const isTransfer = type.value === 'transfer';
      category.hidden = isTransfer;
      share.hidden = isTransfer;
      person.hidden = isTransfer || !share.value;
      toBox.hidden = !isTransfer;
    }
    share.addEventListener('change', syncVisibility);
    const notes = el('textarea', {
      placeholder: 'Observações (opcional)',
      maxlength: 1000,
      rows: 2,
    });
    notes.value = start.notes || '';
    const pending = el('input', { type: 'checkbox', checked: start.status === 'pending' });
    const error = el('p', { class: 'error', role: 'alert', hidden: true });

    function fillCategories(selected) {
      const options = state.categories
        .filter((item) => item.kind === type.value)
        .map((item) => el('option', { value: item._id }, item.name));
      category.replaceChildren(el('option', { value: '' }, 'Sem categoria'), ...options);
      category.value = selected || '';
    }
    type.addEventListener('change', () => {
      fillCategories();
      syncVisibility();
    });
    fillCategories(start.categoryId);
    syncVisibility();

    const form = el(
      'form',
      {
        class: 'card form',
        onsubmit: async (event) => {
          event.preventDefault();
          error.hidden = true;
          const isTransfer = type.value === 'transfer';
          const cents = money.parseMoney(amount.value);
          if (!cents) {
            error.textContent = 'Informe um valor válido, como 12,50';
            error.hidden = false;
            return;
          }
          if (isTransfer && (!toAccount.value || toAccount.value === account.value)) {
            error.textContent = 'Escolha uma conta de destino diferente da origem';
            error.hidden = false;
            return;
          }
          if (!isTransfer && share.value && !person.value.trim()) {
            error.textContent = 'Informe o nome da pessoa';
            error.hidden = false;
            return;
          }
          try {
            await api(current ? '/transactions/' + current._id : '/transactions', {
              method: current ? 'PATCH' : 'POST',
              body: {
                type: type.value,
                amount: cents,
                date: money.toApiDate(date.value),
                description: description.value,
                categoryId: isTransfer ? '' : category.value,
                accountId: account.value,
                toAccountId: isTransfer ? toAccount.value : null,
                status: pending.checked ? 'pending' : 'confirmed',
                shareMode: isTransfer ? '' : share.value,
                personName: !isTransfer && share.value ? person.value : '',
                notes: notes.value.trim(),
              },
            });
            editingId = null;
            await reload();
          } catch (err) {
            error.textContent = [err.message, ...err.details].join(' · ');
            error.hidden = false;
          }
        },
      },
      el('h2', {}, current ? 'Editar lançamento' : 'Novo lançamento'),
      type,
      amount,
      description,
      category,
      account,
      toBox,
      date,
      share,
      person,
      notes,
      el('label', { class: 'check' }, pending, 'Pendente (ainda não pago)'),
      el(
        'button',
        { class: 'btn primary full', type: 'submit' },
        current ? 'Salvar alterações' : 'Adicionar',
      ),
      current &&
        el(
          'button',
          {
            class: 'btn full',
            type: 'button',
            onclick: () => {
              editingId = null;
              renderTransactions(container, state, reload);
            },
          },
          'Cancelar edição',
        ),
      error,
    );

    const categoryNames = new Map(state.categories.map((item) => [item._id, item.name]));
    const accountNames = new Map(state.accounts.map((item) => [item._id, item.name]));

    const rows = state.transactions.map((item) =>
      el(
        'li',
        { class: 'tx' },
        el(
          'div',
          { class: 'tx-main' },
          el(
            'strong',
            {},
            item.description ||
              categoryNames.get(item.categoryId) ||
              TYPE_LABEL[item.type] ||
              'Transferência',
          ),
          el(
            'span',
            { class: 'muted' },
            [
              money.formatDate(item.date),
              categoryNames.get(item.categoryId),
              accountNames.get(item.accountId),
              item.personName && (item.shareMode === 'for' ? 'de ' : 'com ') + item.personName,
            ]
              .filter(Boolean)
              .join(' · '),
          ),
          item.notes && el('span', { class: 'muted' }, item.notes),
          item.status === 'pending' && el('span', { class: 'badge' }, 'pendente'),
        ),
        el(
          'span',
          { class: 'amount ' + item.type },
          (SIGN[item.type] || '') + money.formatMoney(item.amount),
        ),
        el(
          'div',
          { class: 'actions' },
          el(
            'button',
            {
              class: 'btn small',
              type: 'button',
              onclick: () => {
                editingId = item._id;
                renderTransactions(container, state, reload);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              },
            },
            'Editar',
          ),
          el(
            'button',
            {
              class: 'btn small danger',
              type: 'button',
              title: 'Excluir',
              onclick: async () => {
                if (confirm('Excluir este lançamento?')) {
                  await api('/transactions/' + item._id, { method: 'DELETE' });
                  await reload();
                }
              },
            },
            'Excluir',
          ),
        ),
      ),
    );

    container.replaceChildren(
      form,
      el(
        'section',
        { class: 'card' },
        el('h2', {}, 'Lançamentos do mês'),
        rows.length
          ? el('ul', { class: 'list' }, ...rows)
          : el('p', { class: 'muted' }, 'Nenhum lançamento neste mês.'),
      ),
    );
  };
})();
