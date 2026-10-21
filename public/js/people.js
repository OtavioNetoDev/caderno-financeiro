(function () {
  const { el, money } = window.CF;

  // Quanto foi gasto "com" cada pessoa (ambos consumiram) e "de" cada pessoa (só dela).
  function renderPeople(container, state) {
    const totals = new Map();
    for (const item of state.transactions) {
      if (
        item.type !== 'expense' ||
        item.status === 'pending' ||
        !item.personName ||
        !item.shareMode
      ) {
        continue;
      }
      const entry = totals.get(item.personName) || { with: 0, for: 0 };
      entry[item.shareMode] += item.amount;
      totals.set(item.personName, entry);
    }
    if (!totals.size) {
      return;
    }

    const rows = [...totals.entries()]
      .sort((a, b) => b[1].with + b[1].for - (a[1].with + a[1].for))
      .map(([name, total]) =>
        el(
          'tr',
          {},
          el('td', {}, name),
          el('td', { class: 'num' }, money.formatMoney(total.with)),
          el('td', { class: 'num' }, money.formatMoney(total.for)),
          el('td', { class: 'num' }, money.formatMoney(total.with + total.for)),
        ),
      );

    container.append(
      el(
        'section',
        { class: 'card' },
        el('h2', {}, 'Gastos por pessoa'),
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
                el('th', {}, 'Pessoa'),
                el('th', { class: 'num' }, 'Com (juntos)'),
                el('th', { class: 'num' }, 'De (só dela/dele)'),
                el('th', { class: 'num' }, 'Total'),
              ),
            ),
            el('tbody', {}, rows),
          ),
        ),
      ),
    );
  }

  (window.CF.overviewExtras = window.CF.overviewExtras || []).push(renderPeople);
})();
