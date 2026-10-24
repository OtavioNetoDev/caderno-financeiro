(function () {
  const { el, api, money } = window.CF;
  let month = money.currentMonth();
  let editingId = null;

  function showError(node, err) {
    node.textContent = [err.message, ...(err.details || [])].join(' · ');
    node.hidden = false;
  }

  async function render(container) {
    let notes;
    try {
      notes = await api('/notes?month=' + month);
    } catch (err) {
      container.replaceChildren(el('p', { class: 'error' }, err.message));
      return;
    }
    const redraw = () => render(container);

    const monthInput = el('input', {
      type: 'month',
      value: month,
      'aria-label': 'Mês das notas',
      onchange: (event) => {
        if (event.target.value) {
          month = event.target.value;
          editingId = null;
          redraw();
        }
      },
    });
    const title = el('input', { type: 'text', placeholder: 'Título (opcional)', maxlength: 100 });
    const content = el('textarea', {
      rows: 4,
      placeholder: 'Escreva sua observação do mês...',
      required: true,
      maxlength: 5000,
    });
    const error = el('p', { class: 'error', role: 'alert', hidden: true });

    const form = el(
      'form',
      {
        class: 'card form',
        onsubmit: async (event) => {
          event.preventDefault();
          error.hidden = true;
          try {
            await api('/notes', {
              method: 'POST',
              body: { month, title: title.value, content: content.value },
            });
            await redraw();
          } catch (err) {
            showError(error, err);
          }
        },
      },
      el('h2', {}, 'Nova nota'),
      title,
      content,
      el('button', { class: 'btn primary full', type: 'submit' }, 'Salvar nota'),
      error,
    );
    content.className = 'full';

    const cards = notes.map((note) => {
      if (editingId === note._id) {
        const editTitle = el('input', { type: 'text', value: note.title, maxlength: 100 });
        const editContent = el('textarea', { rows: 5, maxlength: 5000 }, note.content);
        return el(
          'section',
          { class: 'card stack' },
          editTitle,
          editContent,
          el(
            'div',
            { class: 'actions' },
            el(
              'button',
              {
                class: 'btn primary small',
                type: 'button',
                onclick: async () => {
                  await api('/notes/' + note._id, {
                    method: 'PATCH',
                    body: { title: editTitle.value, content: editContent.value },
                  });
                  editingId = null;
                  await redraw();
                },
              },
              'Salvar',
            ),
            el(
              'button',
              {
                class: 'btn small',
                type: 'button',
                onclick: () => {
                  editingId = null;
                  redraw();
                },
              },
              'Cancelar',
            ),
          ),
        );
      }
      return el(
        'section',
        { class: 'card' },
        note.title && el('h2', {}, note.title),
        el('p', { style: 'white-space:pre-wrap;margin:0.25rem 0' }, note.content),
        el('span', { class: 'muted' }, money.formatDate(note.createdAt)),
        el(
          'div',
          { class: 'actions' },
          el(
            'button',
            {
              class: 'btn small',
              type: 'button',
              onclick: () => {
                editingId = note._id;
                redraw();
              },
            },
            'Editar',
          ),
          el(
            'button',
            {
              class: 'btn small danger',
              type: 'button',
              onclick: async () => {
                if (confirm('Excluir esta nota?')) {
                  await api('/notes/' + note._id, { method: 'DELETE' });
                  await redraw();
                }
              },
            },
            'Excluir',
          ),
        ),
      );
    });

    container.replaceChildren(
      el('section', { class: 'card page-head' }, el('h2', {}, 'Notas do mês'), monthInput),
      form,
      ...(cards.length ? cards : [el('p', { class: 'muted' }, 'Nenhuma nota neste mês.')]),
    );
  }

  (window.CF.views = window.CF.views || {}).notes = { title: 'Notas', order: 70, render };
})();
