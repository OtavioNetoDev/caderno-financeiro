(function () {
  const { el, api, session } = window.CF;

  // Tela de entrada: alterna entre login e cadastro e chama onSuccess(user) ao concluir.
  window.CF.renderAuth = function renderAuth(container, onSuccess) {
    let mode = 'login';

    function draw() {
      const isRegister = mode === 'register';
      const error = el('p', { class: 'error', role: 'alert', hidden: true });
      const name = el('input', {
        type: 'text',
        placeholder: 'Seu nome',
        autocomplete: 'name',
        required: true,
      });
      const email = el('input', {
        type: 'email',
        placeholder: 'E-mail',
        autocomplete: 'email',
        required: true,
      });
      const password = el('input', {
        type: 'password',
        placeholder: 'Senha (mínimo de 8 caracteres)',
        minlength: 8,
        autocomplete: isRegister ? 'new-password' : 'current-password',
        required: true,
      });
      const submit = el(
        'button',
        { class: 'btn primary', type: 'submit' },
        isRegister ? 'Criar conta' : 'Entrar',
      );

      const form = el(
        'form',
        {
          class: 'card auth',
          onsubmit: async (event) => {
            event.preventDefault();
            error.hidden = true;
            submit.disabled = true;
            try {
              const body = isRegister
                ? { name: name.value, email: email.value, password: password.value }
                : { email: email.value, password: password.value };
              const data = await api('/auth/' + (isRegister ? 'register' : 'login'), {
                method: 'POST',
                body,
              });
              session.setToken(data.token);
              await onSuccess(data.user);
            } catch (err) {
              error.textContent = err.message;
              error.hidden = false;
              submit.disabled = false;
            }
          },
        },
        el('h1', {}, 'Caderno Financeiro'),
        el('p', { class: 'muted' }, isRegister ? 'Crie sua conta' : 'Entre para continuar'),
        isRegister && name,
        email,
        password,
        submit,
        error,
        el(
          'button',
          {
            class: 'btn ghost',
            type: 'button',
            onclick: () => {
              mode = isRegister ? 'login' : 'register';
              draw();
            },
          },
          isRegister ? 'Já tenho conta' : 'Criar uma conta',
        ),
      );

      container.replaceChildren(form);
    }

    draw();
  };
})();
