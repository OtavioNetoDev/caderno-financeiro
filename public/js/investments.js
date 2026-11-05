(function () {
  const { el, api, money } = window.CF;
  const fmt = money.formatMoney;

  const GROUPS = {
    stock: { icon: '📈', label: 'Ações' },
    fii: { icon: '🏢', label: 'Fundos imobiliários' },
    treasury: { icon: '🏛️', label: 'Tesouro' },
    fund: { icon: '📊', label: 'Fundos de investimento' },
    cdb: { icon: '🔒', label: 'CDB' },
    savings: { icon: '🐷', label: 'Poupança e caixinhas' },
    other: { icon: '📦', label: 'Outros' },
  };
  const TYPES = {
    cdb: 'CDB',
    fii: 'Fundo imobiliário',
    fund: 'Fundo',
    stock: 'Ações',
    treasury: 'Tesouro',
    reserve: 'Reserva/cofrinho',
    savings: 'Poupança',
    other: 'Outro',
  };
  const KINDS = { contribution: 'Aporte', redemption: 'Resgate', income: 'Provento' };
  const SOURCES = {
    manual: 'valor real informado',
    cdi: 'estimado pelo CDI',
    rate: 'estimado pela taxa',
    daily: 'estimado pelo ganho por dia',
    cost: 'a preço de custo',
    market: 'cotação de mercado',
  };
  const COLORS = [
    '#3b82f6',
    '#22c55e',
    '#f59e0b',
    '#ef4444',
    '#a855f7',
    '#14b8a6',
    '#ec4899',
    '#84cc16',
  ];

  // Estado da tela: qual quadrado está aberto e qual painel de qual ativo.
  let screen = null;
  let open = null; // { id, mode: 'entry' | 'value' }
  let showForm = false;
  let historyLimit = 10;

  const stat = (label, value, cls) =>
    el(
      'div',
      { class: 'stat' },
      el('span', { class: 'muted' }, label),
      el('strong', { class: cls }, value),
    );

  const gainClass = (value) => (value >= 0 ? 'income' : 'expense');

  function showError(node, err) {
    node.textContent = [err.message, ...(err.details || [])].join(' · ');
    node.hidden = false;
  }

  // Gráfico de pizza em SVG, sem biblioteca. Cada fatia é um ativo do tipo aberto.
  function pie(items) {
    const total = items.reduce((sum, item) => sum + item.value, 0);
    if (total <= 0) {
      return el('p', { class: 'muted' }, 'Sem valor para mostrar no gráfico ainda.');
    }
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '-1.02 -1.02 2.04 2.04');
    svg.setAttribute('class', 'inv-pie');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Participação de cada ativo no valor do grupo');
    let angle = -Math.PI / 2;
    items.forEach((item, index) => {
      const share = item.value / total;
      if (share <= 0) {
        return;
      }
      let node;
      if (share >= 0.9999) {
        node = document.createElementNS(NS, 'circle');
        node.setAttribute('r', '1');
      } else {
        const end = angle + share * 2 * Math.PI;
        node = document.createElementNS(NS, 'path');
        node.setAttribute(
          'd',
          'M 0 0 L ' +
            Math.cos(angle) +
            ' ' +
            Math.sin(angle) +
            ' A 1 1 0 ' +
            (share > 0.5 ? 1 : 0) +
            ' 1 ' +
            Math.cos(end) +
            ' ' +
            Math.sin(end) +
            ' Z',
        );
        angle = end;
      }
      node.setAttribute('fill', COLORS[index % COLORS.length]);
      node.setAttribute('stroke', 'rgba(0,0,0,0.35)');
      node.setAttribute('stroke-width', '0.01');
      svg.appendChild(node);
    });

    const legend = el(
      'ul',
      { class: 'inv-legend' },
      ...items.map((item, index) => {
        const swatch = el('span', { class: 'inv-swatch' });
        swatch.style.background = COLORS[index % COLORS.length];
        return el(
          'li',
          {},
          swatch,
          el('span', {}, item.name),
          el('strong', {}, item.share.toLocaleString('pt-BR') + '%'),
        );
      }),
    );
    return el('div', { class: 'inv-pie-wrap' }, svg, legend);
  }

  function historyList(entries, redraw) {
    if (!entries.length) {
      return el('p', { class: 'muted' }, 'Sem movimentações ainda.');
    }
    return el(
      'ul',
      { class: 'list' },
      ...entries.map((entry) =>
        el(
          'li',
          { class: 'tx' },
          el(
            'div',
            { class: 'tx-main' },
            el('strong', {}, entry.name + ' · ' + KINDS[entry.kind]),
            el(
              'span',
              { class: 'muted' },
              [
                money.formatDate(entry.date),
                entry.quantity ? entry.quantity + ' cotas' : '',
                entry.notes,
              ]
                .filter(Boolean)
                .join(' · '),
            ),
          ),
          el(
            'span',
            { class: 'amount ' + (entry.kind === 'redemption' ? 'expense' : 'income') },
            fmt(entry.amount),
          ),
          el(
            'button',
            {
              class: 'btn small danger',
              type: 'button',
              onclick: async () => {
                if (confirm('Remover esta movimentação?')) {
                  await api('/investments/' + entry.investmentId + '/entries/' + entry.entryId, {
                    method: 'DELETE',
                  });
                  await redraw();
                }
              },
            },
            'Remover',
          ),
        ),
      ),
    );
  }

  // Aporte, resgate ou provento de um ativo.
  function entryForm(item, redraw) {
    const kind = el(
      'select',
      {},
      ...Object.entries(KINDS).map(([value, label]) => el('option', { value }, label)),
    );
    const amount = el('input', {
      type: 'text',
      inputmode: 'decimal',
      placeholder: 'Valor (ex.: 100,00)',
      required: true,
    });
    const date = el('input', { type: 'date', value: money.todayISO(), required: true });
    const quantity = el('input', {
      type: 'text',
      inputmode: 'decimal',
      placeholder: 'Cotas (opcional)',
    });
    const notes = el('input', {
      type: 'text',
      placeholder: 'Observação (opcional)',
      maxlength: 200,
    });
    const error = el('p', { class: 'error', role: 'alert', hidden: true });
    return el(
      'form',
      {
        class: 'form',
        onsubmit: async (event) => {
          event.preventDefault();
          error.hidden = true;
          const cents = money.parseMoney(amount.value);
          if (!cents) {
            error.textContent = 'Informe um valor válido, como 100,00';
            error.hidden = false;
            return;
          }
          const cotas = quantity.value.trim()
            ? Number(quantity.value.replace(',', '.'))
            : undefined;
          try {
            await api('/investments/' + item.id + '/entries', {
              method: 'POST',
              body: {
                kind: kind.value,
                amount: cents,
                date: money.toApiDate(date.value),
                quantity: Number.isFinite(cotas) ? cotas : undefined,
                notes: notes.value,
              },
            });
            await redraw();
          } catch (err) {
            showError(error, err);
          }
        },
      },
      kind,
      amount,
      date,
      quantity,
      notes,
      el('button', { class: 'btn primary', type: 'submit' }, 'Registrar'),
      error,
    );
  }

  // Valor real de hoje (o que o banco mostra). Vazio = voltar a estimar.
  function valueForm(item, redraw) {
    const amount = el('input', {
      type: 'text',
      inputmode: 'decimal',
      placeholder: 'Valor real hoje (vazio = estimar)',
    });
    const error = el('p', { class: 'error', role: 'alert', hidden: true });
    return el(
      'form',
      {
        class: 'form',
        onsubmit: async (event) => {
          event.preventDefault();
          error.hidden = true;
          const text = amount.value.trim();
          const cents = text ? money.parseMoney(text) : 0;
          if (text && !cents) {
            error.textContent = 'Informe um valor válido, como 189,35';
            error.hidden = false;
            return;
          }
          try {
            await api('/investments/' + item.id, {
              method: 'PATCH',
              body: {
                currentValue: cents,
                currentValueDate: cents ? money.toApiDate(money.todayISO()) : null,
              },
            });
            await redraw();
          } catch (err) {
            showError(error, err);
          }
        },
      },
      amount,
      el('button', { class: 'btn primary', type: 'submit' }, 'Salvar valor real'),
      el(
        'p',
        { class: 'muted full' },
        'Use o valor que aparece no app do banco hoje. A partir dele o sistema estima o resto.',
      ),
      error,
    );
  }

  const signed = (value) =>
    (value > 0 ? '+' : '') + value.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + '%';

  // Alta ou baixa em relação ao meu preço médio, como no Nubank.
  function trend(vsAverage) {
    if (vsAverage === null) {
      return null;
    }
    if (vsAverage > 0) {
      return { cls: 'income', text: '▲ na alta: ' + signed(vsAverage) + ' sobre o preço médio' };
    }
    if (vsAverage < 0) {
      return { cls: 'expense', text: '▼ na baixa: ' + signed(vsAverage) + ' sobre o preço médio' };
    }
    return { cls: 'muted', text: '= no preço médio' };
  }

  // Cotação, variação do dia, preço médio e proventos por mês de ações e FIIs.
  function marketLine(item) {
    const box = el('div', { class: 'inv-market' });
    if (!item.market) {
      return box;
    }
    if (!item.price) {
      box.append(
        el(
          'div',
          { class: 'muted' },
          item.ticker
            ? 'Sem cotação agora para ' + item.ticker + '.'
            : 'Defina o ticker em "Cotação e proventos" para ver a cotação.',
        ),
      );
    } else {
      const quote = el('div', {}, 'Cotação ' + fmt(item.price) + ' (' + item.ticker + ')');
      if (item.dayChange !== null) {
        quote.append(
          el('span', { class: gainClass(item.dayChange) }, ' · hoje ' + signed(item.dayChange)),
        );
      }
      box.append(quote);
      const status = trend(item.vsAverage);
      if (status && item.averagePrice) {
        box.append(
          el(
            'div',
            {},
            'Preço médio ' + fmt(item.averagePrice) + ' · ',
            el('span', { class: status.cls }, status.text),
          ),
        );
      }
    }
    box.append(
      item.incomePerShare > 0
        ? el(
            'div',
            {},
            'Proventos: ' +
              fmt(item.monthlyIncome) +
              ' por mês (' +
              fmt(item.incomePerShare) +
              ' por cota × ' +
              item.quantity.toLocaleString('pt-BR') +
              ' cotas)',
          )
        : el(
            'div',
            { class: 'muted' },
            'Defina quanto cada cota paga por mês em "Cotação e proventos".',
          ),
    );
    return box;
  }

  // Ticker e quanto cada cota paga de provento por mês.
  function quoteForm(item, redraw) {
    const ticker = el('input', {
      type: 'text',
      maxlength: 12,
      placeholder: 'Ticker (ex.: MXRF11, VALE3)',
      value: item.ticker || '',
    });
    const perShare = el('input', {
      type: 'text',
      inputmode: 'decimal',
      placeholder: 'Provento por cota por mês (ex.: 0,10)',
      value: item.incomePerShare ? (item.incomePerShare / 100).toFixed(2).replace('.', ',') : '',
    });
    const error = el('p', { class: 'error', role: 'alert', hidden: true });
    return el(
      'form',
      {
        class: 'form',
        onsubmit: async (event) => {
          event.preventDefault();
          error.hidden = true;
          const text = perShare.value.trim();
          const cents = text ? money.parseMoney(text) : 0;
          if (text && !cents) {
            error.textContent = 'Informe o provento por cota como valor, por exemplo 0,10';
            error.hidden = false;
            return;
          }
          try {
            await api('/investments/' + item.id, {
              method: 'PATCH',
              body: { ticker: ticker.value.trim().toUpperCase(), monthlyIncomePerShare: cents },
            });
            await redraw();
          } catch (err) {
            showError(error, err);
          }
        },
      },
      ticker,
      perShare,
      el('button', { class: 'btn primary', type: 'submit' }, 'Salvar'),
      el(
        'p',
        { class: 'muted full' },
        'A cotação vem da bolsa. O provento por cota é o que cada cota paga por mês: o MXRF11, por exemplo, paga cerca de R$ 0,10.',
      ),
      error,
    );
  }

  function itemCard(item, redraw) {
    const details = [TYPES[item.type]];
    if (item.quantity > 0) {
      details.push(item.quantity.toLocaleString('pt-BR') + ' cotas');
    }
    details.push(SOURCES[item.source]);
    const toggle = (mode, label) =>
      el(
        'button',
        {
          class: 'btn small',
          type: 'button',
          onclick: () => {
            open = open && open.id === item.id && open.mode === mode ? null : { id: item.id, mode };
            redraw();
          },
        },
        open && open.id === item.id && open.mode === mode ? 'Fechar' : label,
      );
    const panel =
      open && open.id === item.id
        ? open.mode === 'entry'
          ? entryForm(item, redraw)
          : open.mode === 'quote'
            ? quoteForm(item, redraw)
            : valueForm(item, redraw)
        : null;

    return el(
      'div',
      { class: 'inv-item' },
      el(
        'div',
        { class: 'inv-item-head' },
        el(
          'div',
          {},
          el('strong', {}, item.name),
          el('div', { class: 'muted' }, details.join(' · ')),
          marketLine(item),
        ),
        el(
          'div',
          { class: 'inv-item-values' },
          el('strong', {}, fmt(item.value)),
          el('div', { class: 'muted' }, 'aplicado ' + fmt(item.applied)),
          el('div', { class: gainClass(item.gain) }, 'ganho ' + fmt(item.gain)),
        ),
      ),
      el(
        'div',
        { class: 'actions' },
        toggle('entry', 'Movimentar'),
        ...(item.market ? [toggle('quote', 'Cotação e proventos')] : []),
        toggle('value', 'Valor real'),
        el(
          'button',
          {
            class: 'btn small',
            type: 'button',
            onclick: () => {
              window.CF.simDefaults = { initialCents: item.value, annualPercent: item.rate };
              location.hash = '#/simulator';
            },
          },
          'Simular',
        ),
        el(
          'button',
          {
            class: 'btn small danger',
            type: 'button',
            onclick: async () => {
              if (confirm('Excluir "' + item.name + '" e o histórico dele?')) {
                await api('/investments/' + item.id, { method: 'DELETE' });
                open = null;
                await redraw();
              }
            },
          },
          'Excluir',
        ),
      ),
      panel,
    );
  }

  function groupScreen(data, group, redraw) {
    const ui = GROUPS[group.key];
    const entries = data.history.filter((entry) => entry.group === group.key);
    return [
      el(
        'button',
        {
          class: 'btn small',
          type: 'button',
          onclick: () => {
            screen = null;
            open = null;
            redraw();
          },
        },
        '← Voltar aos investimentos',
      ),
      el(
        'section',
        { class: 'card' },
        el('h2', {}, ui.icon + ' ' + ui.label),
        el(
          'div',
          { class: 'stats' },
          stat('Aplicado', fmt(group.applied), ''),
          stat('Valor atual estimado', fmt(group.value), ''),
          stat('Ganho estimado', fmt(group.gain), gainClass(group.gain)),
          stat('Rende por mês (aprox.)', fmt(group.monthly), 'investment'),
        ),
      ),
      el(
        'section',
        { class: 'card' },
        el('h2', {}, 'Participação de cada ativo'),
        pie(group.items),
      ),
      el(
        'section',
        { class: 'card' },
        el('h2', {}, 'Ativos'),
        ...group.items.map((item) => itemCard(item, redraw)),
      ),
      el('section', { class: 'card' }, el('h2', {}, 'Histórico'), historyList(entries, redraw)),
    ];
  }

  function newForm(redraw, owners = []) {
    const name = el('input', {
      type: 'text',
      placeholder: 'Nome (ex.: CDB banco X, MXRF11)',
      required: true,
      maxlength: 80,
    });
    const type = el(
      'select',
      {},
      ...Object.entries(TYPES).map(([value, label]) => el('option', { value }, label)),
    );
    const rate = el('input', {
      type: 'text',
      inputmode: 'decimal',
      placeholder: 'Taxa anual % (opcional)',
    });
    const daily = el('input', {
      type: 'text',
      inputmode: 'decimal',
      placeholder: 'Ganho por dia útil R$ (opcional)',
    });
    const real = el('input', {
      type: 'text',
      inputmode: 'decimal',
      placeholder: 'Valor real hoje R$ (opcional)',
    });
    // Investimento de outra pessoa (sobrinho, mãe...) fica fora dos seus totais.
    const person = el('input', {
      type: 'text',
      maxlength: 60,
      placeholder: 'De quem é? (vazio = meu)',
      list: 'cf-donos',
    });
    const ownersList = el(
      'datalist',
      { id: 'cf-donos' },
      ...owners.map((n) => el('option', { value: n })),
    );
    const error = el('p', { class: 'error', role: 'alert', hidden: true });
    return el(
      'form',
      {
        class: 'card form',
        onsubmit: async (event) => {
          event.preventDefault();
          error.hidden = true;
          const annualRate = rate.value.trim() ? Number(rate.value.replace(',', '.')) : 0;
          if (!Number.isFinite(annualRate) || annualRate < 0) {
            error.textContent = 'Informe uma taxa anual válida, como 10 ou 12,5';
            error.hidden = false;
            return;
          }
          const dailyGain = daily.value.trim() ? money.parseMoney(daily.value) : 0;
          const currentValue = real.value.trim() ? money.parseMoney(real.value) : 0;
          if (dailyGain === null || currentValue === null) {
            error.textContent = 'Informe os valores em reais, como 1,25';
            error.hidden = false;
            return;
          }
          try {
            await api('/investments', {
              method: 'POST',
              body: {
                name: name.value,
                type: type.value,
                annualRate,
                dailyGain: dailyGain || 0,
                currentValue: currentValue || 0,
                currentValueDate: currentValue ? money.toApiDate(money.todayISO()) : null,
                personName: person.value,
              },
            });
            showForm = false;
            await redraw();
          } catch (err) {
            showError(error, err);
          }
        },
      },
      el('h2', {}, 'Novo investimento'),
      name,
      type,
      rate,
      daily,
      real,
      person,
      ownersList,
      el(
        'p',
        { class: 'muted full' },
        'Não sabe a taxa nem o ganho por dia? Deixe em branco: renda fixa é estimada pelo CDI. Depois registre os aportes em "Movimentar".',
      ),
      el('button', { class: 'btn primary full', type: 'submit' }, 'Cadastrar'),
      error,
    );
  }

  // Investimentos de outras pessoas (sobrinho, mãe...): fora do seu total, cada pessoa com o seu.
  function othersSection(data, redraw) {
    const people = data.others || [];
    if (!people.length) {
      return null;
    }
    return el(
      'section',
      { class: 'card' },
      el('h2', {}, 'De outras pessoas'),
      el('p', { class: 'muted' }, 'Estes investimentos não entram nos seus totais.'),
      ...people.map((person) =>
        el(
          'div',
          { class: 'inv-person' },
          el('h3', {}, person.personName),
          el(
            'div',
            { class: 'stats' },
            stat('Aplicado', fmt(person.applied), ''),
            stat('Valor atual estimado', fmt(person.value), ''),
            stat('Ganho estimado', fmt(person.gain), gainClass(person.gain)),
            stat('Rende por mês (aprox.)', fmt(person.monthly), 'investment'),
          ),
          ...person.items.map((item) => itemCard(item, redraw)),
        ),
      ),
    );
  }

  function homeScreen(data, redraw) {
    const { total } = data;
    const cdiNote =
      data.cdi && data.cdi.annual
        ? 'CDI usado nas estimativas: ' +
          data.cdi.annual.toLocaleString('pt-BR') +
          '% a.a. (Banco Central, ' +
          data.cdi.date +
          '). Valores estimados, sem impostos.'
        : 'Não consegui buscar o CDI agora, então renda fixa aparece a preço de custo. Valores estimados, sem impostos.';

    const tiles = data.groups.map((group) => {
      const ui = GROUPS[group.key];
      return el(
        'button',
        {
          class: 'inv-tile',
          type: 'button',
          onclick: () => {
            screen = group.key;
            open = null;
            redraw();
          },
        },
        el('span', { class: 'inv-tile-icon' }, ui.icon),
        el('strong', {}, ui.label),
        el('span', {}, fmt(group.value)),
        el(
          'span',
          { class: 'muted' },
          group.items.length +
            (group.items.length === 1 ? ' ativo' : ' ativos') +
            ' · ' +
            group.percent.toLocaleString('pt-BR') +
            '%',
        ),
      );
    });

    const shown = data.history.slice(0, historyLimit);
    return [
      el(
        'section',
        { class: 'card' },
        el('h2', {}, 'Meus investimentos'),
        el(
          'div',
          { class: 'stats' },
          stat('Total aplicado', fmt(total.applied), ''),
          stat('Valor atual estimado', fmt(total.value), ''),
          stat('Ganho estimado', fmt(total.gain), gainClass(total.gain)),
          stat('Rende por mês (aprox.)', fmt(total.monthly), 'investment'),
        ),
        el('p', { class: 'muted' }, cdiNote),
      ),
      el(
        'section',
        { class: 'card' },
        el('h2', {}, 'Últimas movimentações'),
        historyList(shown, redraw),
        data.history.length > historyLimit
          ? el(
              'button',
              {
                class: 'btn small',
                type: 'button',
                onclick: () => {
                  historyLimit += 10;
                  redraw();
                },
              },
              'Mostrar mais',
            )
          : null,
      ),
      el(
        'section',
        { class: 'card' },
        el('h2', {}, 'Por tipo'),
        tiles.length
          ? el('div', { class: 'inv-grid' }, ...tiles)
          : el('p', { class: 'muted' }, 'Nenhum investimento cadastrado ainda.'),
        el(
          'button',
          {
            class: 'btn primary',
            type: 'button',
            onclick: () => {
              showForm = !showForm;
              redraw();
            },
          },
          showForm ? 'Cancelar' : '+ Novo investimento',
        ),
      ),
      othersSection(data, redraw),
      showForm
        ? newForm(
            redraw,
            (data.others || []).map((item) => item.personName),
          )
        : null,
    ];
  }

  async function render(container) {
    let data;
    try {
      data = await api('/investments/portfolio');
    } catch (err) {
      container.replaceChildren(el('p', { class: 'error' }, err.message));
      return;
    }
    const redraw = () => render(container);
    const group = screen ? data.groups.find((item) => item.key === screen) : null;
    if (screen && !group) {
      screen = null;
    }
    const nodes = group ? groupScreen(data, group, redraw) : homeScreen(data, redraw);
    container.replaceChildren(...nodes.filter(Boolean));
  }

  (window.CF.views = window.CF.views || {}).investments = {
    title: 'Investimentos',
    order: 40,
    render,
  };
})();
