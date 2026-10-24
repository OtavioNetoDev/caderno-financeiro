(function () {
  const { el, session } = window.CF;

  // Baixa um arquivo da API enviando o token da sessão.
  async function download(path, fallbackName) {
    const response = await fetch(path, {
      headers: { Authorization: 'Bearer ' + session.getToken() },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Falha ao exportar');
    }
    const blob = await response.blob();
    const match = /filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') || '');
    const url = URL.createObjectURL(blob);
    const link = el('a', { href: url, download: match ? match[1] : fallbackName });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function render(container) {
    const from = el('input', { type: 'date', 'aria-label': 'De' });
    const to = el('input', { type: 'date', 'aria-label': 'Até' });
    const message = el('p', { class: 'notice', hidden: true });

    const run = (button, path, name) => async () => {
      message.hidden = true;
      button.disabled = true;
      try {
        await download(path(), name);
      } catch (err) {
        message.textContent = err.message;
        message.hidden = false;
      }
      button.disabled = false;
    };

    const csvPath = () => {
      const params = new URLSearchParams();
      if (from.value) params.set('from', new Date(from.value + 'T00:00:00-03:00').toISOString());
      if (to.value) params.set('to', new Date(to.value + 'T23:59:59.999-03:00').toISOString());
      const query = params.toString();
      return '/export/transactions.csv' + (query ? '?' + query : '');
    };

    const csvButton = el(
      'button',
      { class: 'btn primary', type: 'button' },
      'Baixar lançamentos (CSV)',
    );
    csvButton.addEventListener('click', run(csvButton, csvPath, 'lancamentos.csv'));
    const backupButton = el(
      'button',
      { class: 'btn primary', type: 'button' },
      'Baixar backup completo (JSON)',
    );
    backupButton.addEventListener(
      'click',
      run(backupButton, () => '/export/backup.json', 'backup.json'),
    );

    container.replaceChildren(
      el(
        'section',
        { class: 'card stack' },
        el('h2', {}, 'Lançamentos em planilha'),
        el(
          'p',
          { class: 'muted' },
          'Arquivo CSV para abrir no Excel ou no Planilhas. Deixe as datas vazias para exportar tudo.',
        ),
        el('div', { class: 'form' }, from, to),
        el('div', { class: 'actions' }, csvButton),
      ),
      el(
        'section',
        { class: 'card stack' },
        el('h2', {}, 'Backup completo'),
        el(
          'p',
          { class: 'muted' },
          'Todos os seus dados (contas, categorias, lançamentos, dívidas, investimentos, cartões, metas e notas) em um único arquivo. Guarde-o em local seguro e não envie para o GitHub: ele contém suas finanças. A restauração pela tela ainda não existe.',
        ),
        el('div', { class: 'actions' }, backupButton),
      ),
      message,
    );
  }

  (window.CF.views = window.CF.views || {}).export = { title: 'Exportar', order: 95, render };
})();
