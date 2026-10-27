(function () {
  const CF = window.CF;
  const { el, api, session, money, renderAuth } = CF;
  const app = document.getElementById('app');
  const views = (CF.views = CF.views || {});
  const extras = (CF.overviewExtras = CF.overviewExtras || []);
  const state = {
    user: null,
    month: money.currentMonth(),
    accounts: [],
    balances: null,
    categories: [],
    transactions: [],
    summary: null,
  };

  views.overview = {
    title: 'Visão geral',
    order: 1,
    monthly: true,
    render: (container, s) => {
      CF.renderDashboard(container, s);
      extras.forEach((extra) => extra(container, s));
    },
  };
  views.transactions = {
    title: 'Lançamentos',
    order: 2,
    monthly: true,
    render: (container, s, reload) => CF.renderTransactions(container, s, reload),
  };

  const currentKey = () => {
    const key = location.hash.replace(/^#\/?/, '');
    return views[key] ? key : 'overview';
  };

  const initials = (name) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');

  async function load() {
    const { from, to } = money.monthRange(state.month);
    const query = '?limit=200&from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to);
    const [accounts, balances, categories, transactions, summary] = await Promise.all([
      api('/accounts'),
      api('/accounts/balances'),
      api('/categories'),
      api('/transactions' + query),
      api('/transactions/summary?month=' + state.month),
    ]);
    Object.assign(state, {
      accounts,
      balances,
      categories,
      transactions: transactions.items,
      summary,
    });
  }

  function logout() {
    session.clear();
    state.user = null;
    renderAuth(app, begin);
  }

  function draw() {
    const key = currentKey();
    const view = views[key];
    const links = Object.entries(views)
      .sort((a, b) => a[1].order - b[1].order)
      .map(([name, item]) =>
        el('a', { href: '#/' + name, class: name === key ? 'active' : '' }, item.title),
      );

    const sidebar = el(
      'aside',
      { class: 'sidebar' },
      el(
        'div',
        { class: 'brand' },
        el('div', { class: 'brand-mark' }, 'CF'),
        el(
          'div',
          {},
          el('strong', {}, 'Caderno Financeiro'),
          el('span', {}, 'Gestão financeira pessoal'),
        ),
      ),
      el('nav', { class: 'nav' }, links),
      el('div', { class: 'sidebar-foot' }, 'Acesso restrito ao titular da conta'),
    );

    const month =
      view.monthly &&
      el('input', {
        type: 'month',
        value: state.month,
        'aria-label': 'Mês',
        onchange: (event) => {
          if (event.target.value) {
            state.month = event.target.value;
            refresh();
          }
        },
      });

    const topbar = el(
      'header',
      { class: 'topbar' },
      el('strong', {}, view.title),
      el(
        'div',
        { class: 'topbar-actions' },
        month,
        el('span', { class: 'avatar', title: state.user.name }, initials(state.user.name)),
        el('button', { class: 'btn small ghost', type: 'button', onclick: logout }, 'Sair'),
      ),
    );

    const content = el('div', { class: 'content' });
    app.replaceChildren(
      el('div', { class: 'shell' }, sidebar, el('div', { class: 'main' }, topbar, content)),
    );
    view.render(content, state, refresh);
  }

  function showError(err) {
    app.replaceChildren(el('div', { class: 'content' }, el('p', { class: 'error' }, err.message)));
  }

  async function refresh() {
    try {
      await load();
      draw();
    } catch (err) {
      showError(err);
    }
  }

  async function begin(user) {
    state.user = user;
    await refresh();
  }

  async function start() {
    if (!session.getToken() || /^#reset=/.test(location.hash)) {
      renderAuth(app, begin);
      return;
    }
    try {
      const { user } = await api('/auth/me');
      await begin(user);
    } catch (err) {
      showError(err);
    }
  }

  window.addEventListener('hashchange', () => {
    if (state.user) {
      draw();
    }
  });

  start();
})();
