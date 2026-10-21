(function () {
  const { el, api } = window.CF;
  const app = document.getElementById('app');

  async function start() {
    const status = el('p', { class: 'muted' }, 'Verificando a API...');
    app.replaceChildren(
      el('div', { class: 'container' }, el('h1', {}, 'Caderno Financeiro'), status),
    );
    try {
      const health = await api('/health');
      status.textContent = 'API ' + health.status + ' · banco ' + health.database;
    } catch (err) {
      status.textContent = 'Não foi possível falar com a API: ' + err.message;
    }
  }

  start();
})();
