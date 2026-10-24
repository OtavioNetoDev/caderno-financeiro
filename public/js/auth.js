(function () {
  const { el, api, session } = window.CF;

  const TEXT = {
    login: ['Acesse sua conta', 'Entre para continuar', 'Entrar'],
    register: ['Abra sua conta', 'Preencha os dados abaixo', 'Criar conta'],
    forgot: ['Recuperar acesso', 'Informe o e-mail da sua conta', 'Enviar instruções'],
    reset: ['Nova senha', 'Defina uma nova senha de acesso', 'Salvar nova senha'],
  };

  window.CF.renderAuth = function renderAuth(container, onSuccess) {
    const resetMatch = location.hash.match(/^#reset=([a-f0-9]{64})$/);
    let mode = resetMatch ? 'reset' : 'login';
    let notice = window.CF.session.takeFlash();

    function draw() {
      const [heading, subtitle, label] = TEXT[mode];
      const error = el('p', { class: 'error', role: 'alert', hidden: true });
      const info = el('p', { class: 'notice', hidden: !notice }, notice);
      const isLogin = mode === 'login';

      const name = el('input', {
        type: 'text',
        placeholder: 'Nome completo',
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
        placeholder: isLogin ? 'Senha' : 'Senha (mínimo de 8 caracteres)',
        minlength: isLogin ? null : 8,
        autocomplete: isLogin ? 'current-password' : 'new-password',
        required: true,
      });
      const repeat = el('input', {
        type: 'password',
        placeholder: 'Repita a nova senha',
        minlength: 8,
        autocomplete: 'new-password',
        required: true,
      });
      const fields = {
        login: [email, password],
        register: [name, email, password],
        forgot: [email],
        reset: [password, repeat],
      }[mode];
      const submit = el('button', { class: 'btn primary', type: 'submit' }, label);

      async function run() {
        if (mode === 'login' || mode === 'register') {
          const body =
            mode === 'register'
              ? { name: name.value, email: email.value, password: password.value }
              : { email: email.value, password: password.value };
          const data = await api('/auth/' + mode, { method: 'POST', body });
          session.setToken(data.token);
          await onSuccess(data.user);
        } else if (mode === 'forgot') {
          const data = await api('/auth/forgot-password', {
            method: 'POST',
            body: { email: email.value },
          });
          notice = data.message;
          mode = 'login';
          draw();
        } else {
          if (password.value !== repeat.value) {
            throw new Error('As senhas não conferem');
          }
          const data = await api('/auth/reset-password', {
            method: 'POST',
            body: { token: resetMatch[1], password: password.value },
          });
          history.replaceState(null, '', location.pathname + location.search);
          notice = data.message;
          mode = 'login';
          draw();
        }
      }

      const go = (target, text) =>
        el(
          'button',
          {
            class: 'btn ghost small',
            type: 'button',
            onclick: () => {
              mode = target;
              notice = '';
              draw();
            },
          },
          text,
        );

      const links = {
        login: [go('forgot', 'Esqueci minha senha'), go('register', 'Criar uma conta')],
        register: [go('login', 'Já tenho conta')],
        forgot: [go('login', 'Voltar ao login')],
        reset: [go('login', 'Voltar ao login')],
      }[mode];

      const form = el(
        'form',
        {
          class: 'card auth',
          onsubmit: async (event) => {
            event.preventDefault();
            error.hidden = true;
            submit.disabled = true;
            try {
              await run();
            } catch (err) {
              error.textContent = err.message;
              error.hidden = false;
              submit.disabled = false;
            }
          },
        },
        el(
          'div',
          { class: 'auth-brand' },
          el('div', { class: 'brand-mark' }, 'CF'),
          el('strong', {}, 'Caderno Financeiro'),
        ),
        el('h1', {}, heading),
        el('p', { class: 'muted' }, subtitle),
        info,
        ...fields,
        submit,
        error,
        el('div', { class: 'actions' }, ...links),
      );
      container.replaceChildren(form);
    }

    draw();
  };
})();
