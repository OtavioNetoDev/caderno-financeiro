(function () {
  const CF = (window.CF = window.CF || {});
  const NS = ['http:', '', 'www.w3.org', '2000', 'svg'].join('/');

  // Ícones de traço simples (grade 24x24). A chave é o nome da tela no menu.
  const PATHS = {
    overview: ['M4 4h7v7H4z', 'M13 4h7v4h-7z', 'M13 10h7v10h-7z', 'M4 13h7v7H4z'],
    transactions: ['M8 6h12', 'M8 12h12', 'M8 18h12', 'M4 6h.01', 'M4 12h.01', 'M4 18h.01'],
    reports: ['M4 20v-9', 'M10 20V4', 'M16 20v-7', 'M3 20h18'],
    recurring: ['M20 11a8 8 0 0 0-14.9-3', 'M4 4v4h4', 'M4 13a8 8 0 0 0 14.9 3', 'M20 20v-4h-4'],
    budgets: ['M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z', 'M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8z'],
    debts: ['M12 3v18', 'M17 7H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6'],
    cards: ['M3 6h18v12H3z', 'M3 10h18', 'M7 15h3'],
    investments: ['M3 17l6-6 4 4 8-8', 'M15 7h6v6'],
    simulator: [
      'M6 3h12v18H6z',
      'M9 7h6',
      'M9 12h.01',
      'M12 12h.01',
      'M15 12h.01',
      'M9 16h.01',
      'M12 16h.01',
    ],
    proventos: [
      'M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
      'M3 7l2-3h12',
      'M16 14h.01',
    ],
    rendimentos: ['M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z', 'M12 7v5l3 2'],
    notes: ['M6 3h9l4 4v14H6z', 'M9 12h7', 'M9 16h7'],
    import: ['M12 4v11', 'M7 10l5 5 5-5', 'M4 20h16'],
    export: ['M12 15V4', 'M7 9l5-5 5 5', 'M4 20h16'],
    settings: ['M4 7h8', 'M16 7h4', 'M12 5v4h4V5z', 'M4 17h3', 'M11 17h9', 'M7 15v4h4v-4z'],
  };
  const FALLBACK = ['M12 9a3 3 0 1 0 0 6a3 3 0 0 0 0-6z'];

  // Monta o SVG sem innerHTML. O traço usa a cor do texto (currentColor).
  CF.icon = function icon(name) {
    const node = document.createElementNS(NS, 'svg');
    const attrs = {
      class: 'icon',
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '1.8',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
    };
    for (const [key, value] of Object.entries(attrs)) {
      node.setAttribute(key, value);
    }
    for (const d of PATHS[name] || FALLBACK) {
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', d);
      node.append(path);
    }
    return node;
  };
})();
