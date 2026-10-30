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

  const LABELS = {
    accounts: 'Contas',
    categories: 'Categorias',
    cards: 'Cartões',
    recurring: 'Recorrentes',
    transactions: 'Lançamentos',
    cardCharges: 'Compras no cartão',
    budgets: 'Metas',
    debts: 'Dívidas',
    investments: 'Investimentos',
    notes: 'Notas',
  };
  let restoredMessage = '';

  // Envia o backup; com dryRun, o servidor só mostra o que seria restaurado.
  async function sendBackup(file, dryRun) {
    const body = new FormData();
    body.append('file', file);
    if (dryRun) {
      body.append('dryRun', 'true');
    }
    const response = await fetch('/restore', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + session.getToken() },
      body,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.error || 'Falha ao restaurar o backup');
      error.details = data.details || [];
      throw error;
    }
    return data;
  }

  function summaryList(data) {
    const rows = Object.entries(LABELS)
      .filter(([key]) => {
        const item = data.summary[key];
        return item && (item.inserted || item.restored || item.skipped);
      })
      .map(([key, label]) => {
        const item = data.summary[key];
        return el(
          'li',
          {},
          `${label}: ${item.inserted} novo(s), ${item.restored} recuperado(s), ${item.skipped} já existente(s)`,
        );
      });
    return el('ul', { class: 'list' }, ...rows);
  }

  function restoreCard(refresh) {
    const file = el('input', { type: 'file', accept: '.json,application/json' });
    const error = el('p', { class: 'error', role: 'alert', hidden: true });
    const result = el('div', { class: 'stack' });
    const check = el('button', { class: 'btn', type: 'button' }, 'Verificar backup');

    const fail = (err) => {
      error.textContent = [err.message, ...(err.details || [])].join(' · ');
      error.hidden = false;
    };

    const applyButton = (chosen) => {
      const button = el('button', { class: 'btn primary', type: 'button' }, 'Restaurar agora');
      button.addEventListener('click', async () => {
        if (!confirm('Restaurar estes dados? Nada do que já existe será apagado.')) {
          return;
        }
        error.hidden = true;
        button.disabled = true;
        try {
          await sendBackup(chosen, false);
          restoredMessage = 'Backup restaurado com sucesso.';
          await refresh();
        } catch (err) {
          fail(err);
          button.disabled = false;
        }
      });
      return button;
    };

    file.addEventListener('change', () => {
      result.replaceChildren();
      error.hidden = true;
    });
    check.addEventListener('click', async () => {
      error.hidden = true;
      result.replaceChildren();
      const chosen = file.files[0];
      if (!chosen) {
        fail(new Error('Escolha o arquivo de backup (.json)'));
        return;
      }
      check.disabled = true;
      try {
        const data = await sendBackup(chosen, true);
        const nothing = Object.values(data.summary).every(
          (item) => !item.inserted && !item.restored,
        );
        result.replaceChildren(
          !data.sameOwner &&
            el(
              'p',
              { class: 'notice' },
              'Atenção: este backup pertence a ' +
                (data.owner || 'outra conta') +
                '. Restaurar vai juntar esses dados à sua conta.',
            ),
          summaryList(data),
          nothing
            ? el('p', { class: 'muted' }, 'Nada a restaurar: tudo deste backup já existe.')
            : applyButton(chosen),
        );
      } catch (err) {
        fail(err);
      }
      check.disabled = false;
    });

    return el(
      'section',
      { class: 'card stack' },
      el('h2', {}, 'Restaurar backup'),
      el(
        'p',
        { class: 'muted' },
        'Envie um backup completo (JSON). Primeiro mostramos o que seria restaurado. Nada do que já existe é apagado ou alterado: só entra o que falta, e itens que você excluiu voltam da lixeira.',
      ),
      file,
      el('div', { class: 'actions' }, check),
      result,
      error,
    );
  }

  function render(container, state, refresh) {
    const notice = restoredMessage ? el('p', { class: 'notice' }, restoredMessage) : null;
    restoredMessage = '';
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
          'Todos os seus dados (contas, categorias, lançamentos, dívidas, investimentos, cartões, metas e notas) em um único arquivo. Guarde-o em local seguro e não envie para o GitHub: ele contém suas finanças.',
        ),
        el('div', { class: 'actions' }, backupButton),
      ),
      restoreCard(refresh),
      notice,
      message,
    );
  }

  (window.CF.views = window.CF.views || {}).export = { title: 'Exportar', order: 95, render };
})();
