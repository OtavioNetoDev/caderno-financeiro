(function () {
  const CF = (window.CF = window.CF || {});
  const TOKEN_KEY = 'cf_token';

  CF.session = {
    getToken() {
      try {
        return localStorage.getItem(TOKEN_KEY);
      } catch {
        return null;
      }
    },
    setToken(token) {
      try {
        localStorage.setItem(TOKEN_KEY, token);
      } catch {
        /* armazenamento indisponível */
      }
    },
    clear() {
      try {
        localStorage.removeItem(TOKEN_KEY);
      } catch {
        /* armazenamento indisponível */
      }
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
