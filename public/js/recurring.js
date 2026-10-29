(function () {
  const CF = window.CF;
  const { el, api, money } = CF;
  const TYPE_LABEL = { expense: 'Despesa', income: 'Receita', investment: 'Investimento' };
  let editingId = null;
  let notice = '';

  // "2026-10" -> "10/2026"
  const monthText = (month) => month.slice(5) + '/' + month.slice(0, 4);

  function generateNotice(result) {
    const parts = [
      result.created
        ? 'Criei ' + result.created + ' lançamento(s) de ' + monthText(result.month) + '.'
        : 'Nada novo para gerar em ' + monthText(result.month) + '.',
    ];
    if (result.alreadyExisted) {
      parts.push(result.alreadyExisted + ' já existia(m).');
    }
    if (result.missingAccount) {
      parts.push(result.missingAccount + ' ficou(aram) de fora porque a conta foi excluída.');
    }
    return parts.join(' ');
  }

  async function render(container, state, reload) {
    let items;
    try {
      items = await api('/recurring');
    } catch (err) {
      container.replaceChildren(el('p', { class: 'error' }, err.message));
      return;
    }
    const redraw = () => render(container, state, reload);
    const current = items.find((item) => item._id === editingId) || null;
    if (!current) {
      editingId = null;
    }
    const categoryNames = new Map(state.categories.map((item) => [item._id, item.name]));
    const accountNames = new Map(state.accounts.map((item) => [item._id, item.name]));

    const form = CF.renderRecurringForm(state, current, {
      onSaved: async () => {
        editingId = null;
        notice = '';
        await redraw();
      },
      onCancel: () => {
        editingId = null;
        redraw();
      },
    });

    const generate = el(
      'button',
      {
        class: 'btn primary',
        type: 'button',
        onclick: async () => {
          generate.disabled = true;
          try {
            const result = await api('/recurring/generate', {
              method: 'POST',
              body: { month: state.month },
            });
            notice = generateNotice(result);
            await reload();
          } catch (err) {
            notice = err.message;
            await redraw();
          }
        },
      },
      'Gerar lançamentos de ' + monthText(state.month),
    );

    const rows = items.map((item) =>
      el(
        'li',
        { class: 'tx' },
        el(
          'div',
          { class: 'tx-main' },
          el('strong', {}, item.description),
          el(
            'span',
            { class: 'muted' },
            [
              TYPE_LABEL[item.type],
              'todo dia ' + item.dayOfMonth,
              categoryNames.get(item.categoryId),
              accountNames.get(item.accountId),
              'desde ' +
                monthText(item.startMonth) +
                (item.endMonth ? ' até ' + monthText(item.endMonth) : ''),
            ]
              .filter(Boolean)
              .join(' · '),
          ),
          !item.active && el('span', { class: 'badge' }, 'pausado'),
        ),
        el('span', { class: 'amount ' + item.type }, money.formatMoney(item.amount)),
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
                redraw();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              },
            },
            'Editar',
          ),
          el(
            'button',
            {
              class: 'btn small',
              type: 'button',
              onclick: async () => {
                await api('/recurring/' + item._id, {
                  method: 'PATCH',
                  body: { active: !item.active },
                });
                await redraw();
              },
            },
            item.active ? 'Pausar' : 'Retomar',
          ),
          el(
            'button',
            {
              class: 'btn small danger',
              type: 'button',
              onclick: async () => {
                if (confirm('Excluir este recorrente? Os lançamentos já gerados continuam.')) {
                  await api('/recurring/' + item._id, { method: 'DELETE' });
                  await redraw();
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
        el('h2', {}, 'Gerar lançamentos do mês'),
        el(
          'p',
          { class: 'muted' },
          'Cria os lançamentos dos recorrentes ativos no mês escolhido no topo. É seguro clicar de novo: ' +
            'o que já foi gerado não se repete, e um lançamento que você excluiu não volta.',
        ),
        generate,
        notice && el('p', { role: 'status' }, notice),
      ),
      el(
        'section',
        { class: 'card' },
        el('h2', {}, 'Recorrentes cadastrados'),
        rows.length
          ? el('ul', { class: 'list' }, ...rows)
          : el(
              'p',
              { class: 'muted' },
              'Nenhum recorrente ainda. Cadastre Netflix, aluguel, salário...',
            ),
      ),
    );
  }

  (CF.views = CF.views || {}).recurring = {
    title: 'Recorrentes',
    order: 25,
    monthly: true,
    render,
  };
})();
