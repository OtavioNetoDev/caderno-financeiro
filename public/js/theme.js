(function () {
  const KEY = 'cf_tema';
  const THEMES = ['escuro', 'claro'];

  function read() {
    try {
      const saved = localStorage.getItem(KEY);
      return THEMES.includes(saved) ? saved : 'escuro';
    } catch {
      return 'escuro';
    }
  }

  function apply(theme) {
    document.documentElement.dataset.theme = theme;
  }

  const CF = (window.CF = window.CF || {});
  CF.theme = {
    current: () => document.documentElement.dataset.theme || 'escuro',
    set(theme) {
      if (!THEMES.includes(theme)) {
        return;
      }
      apply(theme);
      try {
        localStorage.setItem(KEY, theme);
      } catch {
        // Sem armazenamento (janela privada): o tema só vale nesta tela.
      }
    },
    toggle() {
      this.set(this.current() === 'escuro' ? 'claro' : 'escuro');
    },
  };

  // Roda no <head>, antes de desenhar a página, para não piscar o tema errado.
  apply(read());
})();
