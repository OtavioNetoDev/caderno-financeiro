(function () {
  const { el } = window.CF;

  const TYPES = [
    ['', 'Todos os tipos'],
    ['expense', 'Despesas'],
    ['income', 'Receitas'],
    ['investment', 'Investimentos'],
    ['transfer', 'Transferências'],
  ];
  const STATUSES = [
    ['', 'Qualquer status'],
    ['confirmed', 'Confirmados'],
    ['pending', 'Pendentes'],
  ];

  function select(label, options, value, onchange) {
    return el(
      'select',
      { 'aria-label': label, onchange: (event) => onchange(event.target.value) },
      options.map(([optionValue, text]) =>
        el('option', { value: optionValue, selected: optionValue === value }, text),
      ),
    );
  }

  // Barra de busca e filtros. Altera o objeto `filters` e avisa por onChange;
  // só a lista é redesenhada, então o campo de busca não perde o foco ao digitar.
  window.CF.renderFilterBar = function renderFilterBar(state, filters, onChange) {
    const { EMPTY, NO_CATEGORY } = window.CF.transactionFilters;
    const set = (key) => (value) => {
      filters[key] = value;
      onChange();
    };

    const search = el('input', {
      type: 'search',
      placeholder: 'Buscar por descrição, observação, pessoa, categoria ou conta',
      'aria-label': 'Buscar lançamentos',
      maxlength: 100,
      value: filters.text || null,
      oninput: (event) => set('text')(event.target.value),
    });
    const type = select('Tipo', TYPES, filters.type, set('type'));
    const status = select('Status', STATUSES, filters.status, set('status'));
    const category = select(
      'Categoria',
      [
        ['', 'Todas as categorias'],
        [NO_CATEGORY, 'Sem categoria'],
        ...state.categories.map((item) => [item._id, item.name]),
      ],
      filters.categoryId,
      set('categoryId'),
    );
    const clear = el(
      'button',
      {
        class: 'btn small ghost',
        type: 'button',
        onclick: () => {
          Object.assign(filters, EMPTY);
          search.value = '';
          type.value = '';
          status.value = '';
          category.value = '';
          onChange();
        },
      },
      'Limpar filtros',
    );

    return el('div', { class: 'filters' }, search, type, status, category, clear);
  };
})();
