(function () {
  const { session } = window.CF;
  const IDLE_MS = 15 * 60 * 1000; // encerra a sessão após 15 minutos sem uso
  let lastActivity = Date.now();

  const touch = () => {
    lastActivity = Date.now();
  };
  ['click', 'keydown', 'touchstart', 'scroll', 'mousemove'].forEach((name) =>
    window.addEventListener(name, touch, { passive: true }),
  );

  setInterval(() => {
    if (session.getToken() && Date.now() - lastActivity > IDLE_MS) {
      session.clear();
      session.setFlash('Sessão encerrada por inatividade. Entre novamente.');
      location.reload();
    }
  }, 30 * 1000);
})();
