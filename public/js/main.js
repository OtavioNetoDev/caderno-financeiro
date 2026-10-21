(function () {
  const { el, api, session, renderAuth } = window.CF;
  const app = document.getElementById('app');

  async function begin() {
    const { user } = await api('/auth/me');
    app.replaceChildren(
      el(
        'div',
        { class: 'container' },
        el('h1', {}, 'Olá, ' + user.name),
        el(
          'button',
          {
            class: 'btn',
            type: 'button',
            onclick: () => {
              session.clear();
              renderAuth(app, begin);
            },
          },
          'Sair',
        ),
      ),
    );
  }

  async function start() {
    if (!session.getToken()) {
      renderAuth(app, begin);
      return;
    }
    try {
      await begin();
    } catch (err) {
      app.replaceChildren(
        el('div', { class: 'container' }, el('p', { class: 'error' }, err.message)),
      );
    }
  }

  start();
})();
