(function () {
  const CF = (window.CF = window.CF || {});
  const TOKEN_KEY = 'cf_token';
  const FLASH_KEY = 'cf_flash';

  function safe(action) {
    try {
      return action();
    } catch {
      return null;
    }
  }

  // O token fica só na aba (sessionStorage): ao fechar o navegador é preciso entrar de novo.
  CF.session = {
    getToken() {
      safe(() => localStorage.removeItem(TOKEN_KEY)); // descarta o token da versão anterior
      return safe(() => sessionStorage.getItem(TOKEN_KEY));
    },
    setToken(token) {
      safe(() => sessionStorage.setItem(TOKEN_KEY, token));
    },
    clear() {
      safe(() => sessionStorage.removeItem(TOKEN_KEY));
      safe(() => localStorage.removeItem(TOKEN_KEY));
    },
    // Mensagem exibida na tela de login após um logout automático.
    setFlash(message) {
      safe(() => sessionStorage.setItem(FLASH_KEY, message));
    },
    takeFlash() {
      const message = safe(() => sessionStorage.getItem(FLASH_KEY)) || '';
      safe(() => sessionStorage.removeItem(FLASH_KEY));
      return message;
    },
  };

  // Chamada à API com o token da sessão; lança Error com a mensagem do servidor.
  CF.api = async function api(path, { method = 'GET', body } = {}) {
    const headers = {};
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    const token = CF.session.getToken();
    if (token) {
      headers.Authorization = 'Bearer ' + token;
    }

    const response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status === 204) {
      return null;
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 && token) {
        CF.session.clear();
        CF.session.setFlash('Sessão expirada. Entre novamente.');
        location.reload();
      }
      const error = new Error(data.error || 'Erro inesperado');
      error.status = response.status;
      error.details = data.details || [];
      throw error;
    }
    return data;
  };
})();
