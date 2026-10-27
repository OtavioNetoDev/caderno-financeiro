(function () {
  const { el, api, session, money } = window.CF;
  const fmt = money.formatMoney;
  const TYPE_LABEL = { expense: 'Despesa', income: 'Receita', investment: 'Investimento' };
  let preview = null;
  let message = '';
  let formats = null;

  async function sendFile(file, people) {
    const body = new FormData();
    body.append('people', people);
    body.append('file', file);
    const response = await fetch('/imports/preview', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + session.getToken() },
      body,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Falha ao ler o arquivo');
    }
    return data;
  }

  function fillCategory(row, state) {
    const found = state.categories.find(
      (item) => item.kind === row.type && item.name === row.category,
    );
    row.categoryId = found ? found._id : '';
  }

  function rowView(row, state, onChange) {
    if (row.categoryId === undefined) {
      fillCategory(row, state);
    }

    const pick = el('input', {
      type: 'checkbox',
      checked: row.selected,
      'aria-label': 'Importar esta linha',
    });
    pick.addEventListener('change', () => {
      row.selected = pick.checked;
      onChange();
    });

    const date = el('input', { type: 'date', value: row.date || null });
    date.addEventListener('input', () => {
      row.date = date.value;
    });

    const text = el('input', { type: 'text', class: 'col-desc', value: row.text, maxlength: 200 });
    text.addEventListener('input', () => {
      row.text = text.value;
    });

    const amount = el('input', {
      type: 'text',
      class: 'col-money',
      inputmode: 'decimal',
      placeholder: '0,00',
      value: row.amount ? (row.amount / 100).toFixed(2).replace('.', ',') : null,
    });
    amount.addEventListener('input', () => {
      row.amount = money.parseMoney(amount.value);
      onChange();
    });

    const type = el(
      'select',
      {},
      ...Object.entries(TYPE_LABEL).map(([value, label]) => el('option', { value }, label)),
    );
    type.value = row.type;
    const category = el('select', { class: 'col-cat' });
    const fillOptions = () => {
      const options = state.categories
        .filter((item) => item.kind === row.type)
        .map((item) => el('option', { value: item._id }, item.name));
      category.replaceChildren(el('option', { value: '' }, 'Sem categoria'), ...options);
      category.value = row.categoryId || '';
    };
    type.addEventListener('change', () => {
      row.type = type.value;
      fillCategory(row, state);
      fillOptions();
      onChange();
    });
    category.addEventListener('change', () => {
      row.categoryId = category.value;
    });
    fillOptions();

    const share = el(
      'select',
      {},
      el('option', { value: '' }, 'Só eu'),
      el('option', { value: 'with' }, 'Com'),
      el('option', { value: 'for' }, 'De'),
    );
    share.value = row.shareMode || '';
    const person = el('input', {
      type: 'text',
      placeholder: 'Pessoa',
      maxlength: 60,
      value: row.personName || null,
    });
    person.hidden = !row.shareMode;
    share.addEventListener('change', () => {
      row.shareMode = share.value;
      person.hidden = !share.value;
    });
    person.addEventListener('input', () => {
      row.personName = person.value;
    });

    const notes = el(
      'td',
      {},
      row.duplicate && el('span', { class: 'badge' }, 'duplicado'),
      el('div', { class: 'muted' }, row.flags.filter((flag) => flag !== 'duplicado').join(' · ')),
    );

    return el(
      'tr',
      { class: row.confidence === 'low' || row.duplicate ? 'row-warn' : '' },
      el('td', {}, pick),
      el('td', {}, date),
      el('td', {}, text),
      el('td', { class: 'num' }, amount),
      el('td', {}, type),
      el('td', {}, category),
      el('td', {}, share, person),
      notes,
    );
  }

  function previewCard(state, refresh, redraw) {
    const account = el(
      'select',
      {},
      ...state.accounts.map((item) => el('option', { value: item._id }, item.name)),
    );
    const counter = el('p', { class: 'muted' });
    const error = el('p', { class: 'error', role: 'alert', hidden: true });

    const update = () => {
      const chosen = preview.rows.filter((row) => row.selected);
      const sum = (types) =>
        chosen
          .filter((row) => types.includes(row.type))
          .reduce((total, row) => total + (row.amount || 0), 0);
      counter.textContent =
        chosen.length +
        ' de ' +
        preview.rows.length +
        ' selecionadas · receitas ' +
        fmt(sum(['income'])) +
        ' · despesas e aportes ' +
        fmt(sum(['expense', 'investment']));
    };
    const setAll = (picker) => () => {
      preview.rows.forEach((row) => {
        row.selected = picker(row);
      });
      redraw();
    };

    const confirmButton = el(
      'button',
      { class: 'btn primary', type: 'button' },
      'Importar selecionadas',
    );
    confirmButton.addEventListener('click', async () => {
      error.hidden = true;
      const chosen = preview.rows.filter((row) => row.selected);
      const invalid = chosen.filter(
        (row) => !row.date || !Number.isInteger(row.amount) || row.amount < 1 || !row.text.trim(),
      );
      if (!chosen.length) {
        error.textContent = 'Selecione ao menos uma linha';
        error.hidden = false;
        return;
      }
      if (invalid.length) {
        error.textContent =
          'Corrija data, valor e descrição nas linhas: ' +
          invalid
            .slice(0, 5)
            .map((row) => row.line)
            .join(', ');
        error.hidden = false;
        return;
      }
      confirmButton.disabled = true;
      try {
        const result = await api('/imports/confirm', {
          method: 'POST',
          body: {
            accountId: account.value,
            fileName: preview.fileName,
            format: preview.format,
            rows: chosen.map((row) => ({
              date: row.date,
              amount: row.amount,
              type: row.type,
              description: row.text.trim().slice(0, 200),
              categoryId: row.categoryId || undefined,
              personName: row.shareMode ? row.personName || '' : '',
              shareMode: row.shareMode || undefined,
              status: row.status,
            })),
          },
        });
        message =
          'Importados: ' +
          result.importedRows +
          ' · duplicados ignorados: ' +
          result.skippedDuplicates;
        preview = null;
        await refresh();
      } catch (err) {
        error.textContent = err.message;
        error.hidden = false;
        confirmButton.disabled = false;
      }
    });

    const body = preview.rows.map((row) => rowView(row, state, update));
    update();

    return el(
      'section',
      { class: 'card stack' },
      el('h2', {}, 'Revisão: ' + preview.fileName),
      el(
        'p',
        { class: 'muted' },
        'Linhas destacadas pedem atenção (valor incerto, dívida, data fora do mês ou duplicadas) e vêm desmarcadas. Edite o que precisar e marque o que quer importar.' +
          (preview.ignoredCount
            ? ' ' + preview.ignoredCount + ' linha(s) do arquivo foram ignoradas.'
            : ''),
      ),
      el(
        'div',
        { class: 'actions' },
        el(
          'button',
          { class: 'btn small', type: 'button', onclick: setAll((row) => row.auto) },
          'Só as sugeridas',
        ),
        el(
          'button',
          {
            class: 'btn small',
            type: 'button',
            onclick: setAll((row) => !row.duplicate && row.amount > 0),
          },
          'Marcar todas com valor',
        ),
        el(
          'button',
          { class: 'btn small', type: 'button', onclick: setAll(() => false) },
          'Desmarcar todas',
        ),
      ),
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
              el('th', {}),
              el('th', {}, 'Data'),
              el('th', {}, 'Descrição'),
              el('th', { class: 'num' }, 'Valor'),
              el('th', {}, 'Tipo'),
              el('th', {}, 'Categoria'),
              el('th', {}, 'Com/De'),
              el('th', {}, 'Avisos'),
            ),
          ),
          el('tbody', {}, body),
        ),
      ),
      counter,
      el(
        'div',
        { class: 'form' },
        el(
          'label',
          { class: 'field' },
          el('span', { class: 'muted' }, 'Conta de destino'),
          account,
        ),
      ),
      el(
        'div',
        { class: 'actions' },
        confirmButton,
        el(
          'button',
          {
            class: 'btn',
            type: 'button',
            onclick: () => {
              preview = null;
              redraw();
            },
          },
          'Cancelar',
        ),
      ),
      error,
    );
  }

  async function render(container, state, refresh) {
    let batches;
    try {
      if (!formats) {
        formats = (await api('/imports/formats')).extensions;
      }
      batches = await api('/imports');
    } catch (err) {
      container.replaceChildren(el('p', { class: 'error' }, err.message));
      return;
    }
    const redraw = () => render(container, state, refresh);

    const file = el('input', { type: 'file', accept: formats.join(','), required: true });
    const people = el('input', {
      type: 'text',
      placeholder: 'Nomes para reconhecer, separados por vírgula (ex.: Raisa)',
      maxlength: 200,
    });
    const uploadError = el('p', { class: 'error', role: 'alert', hidden: true });
    const upload = el(
      'form',
      {
        class: 'card form',
        onsubmit: async (event) => {
          event.preventDefault();
          uploadError.hidden = true;
          const chosen = file.files[0];
          if (!chosen) {
            return;
          }
          try {
            const data = await sendFile(chosen, people.value);
            data.rows.forEach((row) => {
              row.auto = row.selected;
            });
            preview = { ...data, fileName: chosen.name };
            message = '';
            await redraw();
          } catch (err) {
            uploadError.textContent = err.message;
            uploadError.hidden = false;
          }
        },
      },
      el('h2', {}, 'Importar documento'),
      el(
        'p',
        { class: 'muted full' },
        'Formatos aceitos: ' +
          formats.join(', ') +
          ' (até 5 MB). Nada é salvo antes de você revisar e confirmar.',
      ),
      file,
      people,
      el('button', { class: 'btn primary', type: 'submit' }, 'Ler arquivo'),
      uploadError,
    );

    const rows = batches.map((batch) =>
      el(
        'tr',
        {},
        el('td', {}, batch.fileName),
        el('td', {}, batch.format),
        el('td', {}, money.formatDate(batch.createdAt)),
        el('td', { class: 'num' }, String(batch.importedRows)),
        el('td', { class: 'num' }, String(batch.skippedDuplicates)),
        el(
          'td',
          { class: 'num' },
          batch.status === 'undone'
            ? el('span', { class: 'badge' }, 'desfeita')
            : el(
                'button',
                {
                  class: 'btn small danger',
                  type: 'button',
                  onclick: async () => {
                    if (
                      confirm('Desfazer esta importação? Os lançamentos dela vão para a lixeira.')
                    ) {
                      await api('/imports/' + batch._id, { method: 'DELETE' });
                      await refresh();
                    }
                  },
                },
                'Desfazer',
              ),
        ),
      ),
    );

    container.replaceChildren(
      ...(message ? [el('p', { class: 'notice' }, message)] : []),
      upload,
      ...(preview ? [previewCard(state, refresh, redraw)] : []),
      el(
        'section',
        { class: 'card' },
        el('h2', {}, 'Importações anteriores'),
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
                    el('th', {}, 'Arquivo'),
                    el('th', {}, 'Formato'),
                    el('th', {}, 'Data'),
                    el('th', { class: 'num' }, 'Importados'),
                    el('th', { class: 'num' }, 'Duplicados'),
                    el('th', {}),
                  ),
                ),
                el('tbody', {}, rows),
              ),
            )
          : el('p', { class: 'muted' }, 'Nenhuma importação ainda.'),
      ),
    );
  }

  (window.CF.views = window.CF.views || {}).import = { title: 'Importar', order: 85, render };
})();
