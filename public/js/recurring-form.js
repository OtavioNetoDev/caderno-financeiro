(function () {
  const { el, api, money } = window.CF;
  const TYPE_LABEL = { expense: 'Despesa', income: 'Receita', investment: 'Investimento' };

  function field(label, input) {
    return el('label', { class: 'field' }, el('span', { class: 'muted' }, label), input);
  }

  // Formulário de recorrente. `current` é o item em edição (ou null para um novo).
  // Chama onSaved() depois de salvar e onCancel() ao cancelar uma edição.
  window.CF.renderRecurringForm = function renderRecurringForm(state, current, handlers) {
    const start = current || {};

    const description = el('input', {
      type: 'text',
      placeholder: 'Descrição (ex.: Netflix)',
      maxlength: 100,
      required: true,
      value: start.description || null,
    });
    const amount = el('input', {
      type: 'text',
      inputmode: 'decimal',
      placeholder: 'Valor (ex.: 55,90)',
      required: true,
      value: current ? (current.amount / 100).toFixed(2).replace('.', ',') : null,
    });
    const type = el(
      'select',
      {},
      ...Object.entries(TYPE_LABEL).map(([value, label]) => el('option', { value }, label)),
    );
    type.value = start.type || 'expense';
    const category = el('select', {});
    const account = el(
      'select',
      {},
      ...state.accounts.map((item) => el('option', { value: item._id }, item.name)),
    );
    account.value = start.accountId || (state.accounts[0] ? state.accounts[0]._id : '');
    const day = el('input', {
      type: 'number',
      min: 1,
      max: 31,
      step: 1,
      required: true,
      placeholder: 'Dia do mês (1 a 31)',
      'aria-label': 'Dia do mês',
      value: start.dayOfMonth || null,
    });
    const startMonth = el('input', {
      type: 'month',
      required: true,
      value: start.startMonth || state.month,
    });
    const endMonth = el('input', { type: 'month', value: start.endMonth || null });
    const status = el(
      'select',
      {},
      el('option', { value: 'pending' }, 'Entra como pendente (confirmo quando pagar)'),
      el('option', { value: 'confirmed' }, 'Entra como confirmado'),
    );
    status.value = start.status || 'pending';
    const error = el('p', { class: 'error', role: 'alert', hidden: true });

    function fillCategories(selected) {
      const options = state.categories
        .filter((item) => item.kind === type.value)
        .map((item) => el('option', { value: item._id }, item.name));
      category.replaceChildren(el('option', { value: '' }, 'Sem categoria'), ...options);
      category.value = selected || '';
    }
    type.addEventListener('change', () => fillCategories());
    fillCategories(start.categoryId);

    return el(
      'form',
      {
        class: 'card form',
        onsubmit: async (event) => {
          event.preventDefault();
          error.hidden = true;
          const cents = money.parseMoney(amount.value);
          if (!cents) {
            error.textContent = 'Informe um valor válido, como 55,90';
            error.hidden = false;
            return;
          }
          try {
            await api(current ? '/recurring/' + current._id : '/recurring', {
              method: current ? 'PATCH' : 'POST',
              body: {
                description: description.value,
                amount: cents,
                type: type.value,
                dayOfMonth: Number(day.value),
                startMonth: startMonth.value,
                endMonth: endMonth.value || null,
                status: status.value,
                categoryId: category.value || null,
                accountId: account.value,
              },
            });
            await handlers.onSaved();
          } catch (err) {
            error.textContent = [err.message, ...(err.details || [])].join(' · ');
            error.hidden = false;
          }
        },
      },
      el('h2', {}, current ? 'Editar recorrente' : 'Novo recorrente'),
      description,
      amount,
      type,
      category,
      account,
      day,
      field('Começa em', startMonth),
      field('Termina em (opcional)', endMonth),
      status,
      el(
        'button',
        { class: 'btn primary full', type: 'submit' },
        current ? 'Salvar alterações' : 'Adicionar',
      ),
      current &&
        el(
          'button',
          { class: 'btn full', type: 'button', onclick: () => handlers.onCancel() },
          'Cancelar edição',
        ),
      error,
    );
  };
})();
