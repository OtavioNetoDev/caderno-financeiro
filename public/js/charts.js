(function () {
  const CF = (window.CF = window.CF || {});
  const { el } = CF;
  const core = CF.chartsCore;
  const NS = 'http://www.w3.org/2000/svg';

  // Cria elementos SVG sem innerHTML (texto vira nó de texto).
  function svg(tag, attrs = {}, ...children) {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key.startsWith('on')) {
        node.addEventListener(key.slice(2), value);
      } else if (value !== false && value != null) {
        node.setAttribute(key, value === true ? '' : value);
      }
    }
    for (const child of children.flat()) {
      if (child == null || child === false) {
        continue;
      }
      node.append(child.nodeType ? child : document.createTextNode(String(child)));
    }
    return node;
  }

  // A cor segue a posição da série (nunca o ranking), para não mudar ao esconder uma série.
  const seriesColor = (index) => 'var(--series-' + ((index % core.PALETTE_SIZE) + 1) + ')';

  const WIDTH = 640;
  const HEIGHT = 320;
  const MARGIN = { top: 16, right: 16, bottom: 36, left: 56 };

  // Tipos de gráfico registrados pelos outros arquivos (barras, linhas, radiais).
  const types = {};

  function register(name, definition) {
    types[name] = definition;
  }

  // Linhas de grade e rótulos do eixo Y. Devolve a função que converte valor em posição Y.
  function drawYAxis(ctx, range) {
    const { m, plotW, plotH } = ctx;
    const toY = (value) => core.scaleLinear(value, range.min, range.max, m.top + plotH, m.top);
    const group = svg('g', { class: 'chart-grid' });
    for (const tick of range.ticks) {
      const y = toY(tick);
      group.append(
        svg('line', {
          x1: m.left,
          x2: m.left + plotW,
          y1: y,
          y2: y,
          class: tick === 0 ? 'zero' : '',
        }),
        svg(
          'text',
          { x: m.left - 8, y: y + 4, 'text-anchor': 'end', class: 'chart-tick' },
          ctx.axisFormat(tick),
        ),
      );
    }
    ctx.root.append(group);
    return toY;
  }

  // Rótulos do eixo X, pulando alguns quando há muitas categorias.
  function drawXLabels(ctx, positions) {
    const { m, plotH, categories } = ctx;
    const step = Math.max(1, Math.ceil(categories.length / 12));
    const group = svg('g', { class: 'chart-xlabels' });
    categories.forEach((label, index) => {
      if (index % step === 0) {
        group.append(
          svg(
            'text',
            {
              x: positions[index],
              y: m.top + plotH + 20,
              'text-anchor': 'middle',
              class: 'chart-tick',
            },
            label,
          ),
        );
      }
    });
    ctx.root.append(group);
  }

  function makeTooltip(figure) {
    const tip = el('div', { class: 'chart-tip', role: 'status', hidden: true });
    figure.append(tip);
    return {
      show(event, title, rows) {
        tip.replaceChildren(
          ...[
            title ? el('strong', {}, title) : null,
            rows.map((row) =>
              el(
                'div',
                { class: 'chart-tip-row' },
                el('i', { class: 'swatch', style: 'background:' + row.color }),
                el('span', {}, row.label),
                el('b', {}, row.value),
              ),
            ),
          ]
            .flat()
            .filter(Boolean),
        );
        tip.hidden = false;
        const box = figure.getBoundingClientRect();
        const x = event.clientX - box.left;
        const y = event.clientY - box.top;
        const flip = x > box.width / 2;
        tip.style.left = flip ? 'auto' : x + 12 + 'px';
        tip.style.right = flip ? box.width - x + 12 + 'px' : 'auto';
        tip.style.top = Math.max(0, y - 8) + 'px';
      },
      hide() {
        tip.hidden = true;
      },
    };
  }

  function buildTable(spec, entities, fmt) {
    const slices = types[spec.type] && types[spec.type].slices;
    if (slices) {
      return el(
        'table',
        { class: 'chart-table' },
        el(
          'thead',
          {},
          el('tr', {}, el('th', {}, 'Item'), el('th', {}, spec.valueLabel || 'Valor')),
        ),
        el(
          'tbody',
          {},
          entities.map((item) =>
            el('tr', {}, el('td', {}, item.name), el('td', {}, fmt(item.value))),
          ),
        ),
      );
    }
    return el(
      'table',
      { class: 'chart-table' },
      el(
        'thead',
        {},
        el(
          'tr',
          {},
          el('th', {}, spec.categoryLabel || ''),
          entities.map((s) => el('th', {}, s.name)),
        ),
      ),
      el(
        'tbody',
        {},
        spec.categories.map((label, i) =>
          el(
            'tr',
            {},
            el('td', {}, label),
            entities.map((s) => el('td', {}, s.values[i] == null ? '-' : fmt(s.values[i]))),
          ),
        ),
      ),
    );
  }

  // Converte a especificação em "entidades" desenháveis (séries, ou fatias nos gráficos radiais).
  function entitiesOf(spec, definition) {
    if (definition.slices) {
      const source = spec.series[0] || { values: [] };
      return spec.categories.map((name, index) => ({
        name,
        value: source.values[index] || 0,
        index,
        color: seriesColor(index),
      }));
    }
    return spec.series.map((serie, index) => ({
      ...serie,
      index,
      color: serie.color || seriesColor(index),
    }));
  }

  // spec: { type, title, categories: [rótulos], series: [{ name, values, color? }], format?, axisFormat? }
  // Nos gráficos de pizza e rosca, cada categoria é uma fatia e vale a primeira série.
  function render(container, spec) {
    const definition = types[spec.type] || types.bar;
    const format = spec.format || CF.money.formatMoney;
    const hidden = new Set();
    const figure = el('figure', { class: 'chart' });
    const stage = el('div', { class: 'chart-stage' });
    const legend = el('div', { class: 'chart-legend' });
    const tip = makeTooltip(figure);
    let showTable = false;

    const all = entitiesOf(spec, definition);
    const hasData = all.some((item) => (item.values || [item.value]).some((v) => v));

    function drawPlot() {
      const entities = all.filter((item) => !hidden.has(item.index));
      stage.replaceChildren();
      if (!hasData || !spec.categories.length) {
        stage.append(
          el('p', { class: 'muted chart-empty' }, spec.emptyText || 'Sem dados no período.'),
        );
        return;
      }
      if (definition.minCategories && spec.categories.length < definition.minCategories) {
        stage.append(
          el(
            'p',
            { class: 'muted chart-empty' },
            'Este gráfico precisa de pelo menos ' + definition.minCategories + ' itens.',
          ),
        );
        return;
      }
      if (showTable) {
        stage.append(buildTable(spec, entities, format));
        return;
      }
      const m = definition.margin || MARGIN;
      const root = svg('svg', {
        viewBox: '0 0 ' + WIDTH + ' ' + HEIGHT,
        class: 'chart-svg',
        role: 'img',
        'aria-label': spec.title || 'Gráfico',
      });
      const ctx = {
        spec,
        root,
        svg,
        m,
        W: WIDTH,
        H: HEIGHT,
        plotW: WIDTH - m.left - m.right,
        plotH: HEIGHT - m.top - m.bottom,
        entities,
        categories: spec.categories,
        format,
        axisFormat: spec.axisFormat || core.formatCompact,
        tip,
        drawYAxis: (range) => drawYAxis(ctx, range),
        drawXLabels: (positions) => drawXLabels(ctx, positions),
      };
      definition.draw(ctx);
      root.addEventListener('mouseleave', () => tip.hide());
      stage.append(root);
    }

    function drawLegend() {
      legend.replaceChildren(
        ...(all.length > 1 || definition.slices
          ? all.map((item) =>
              el(
                'button',
                {
                  type: 'button',
                  class: 'legend-item' + (hidden.has(item.index) ? ' off' : ''),
                  'aria-pressed': String(!hidden.has(item.index)),
                  onclick: () => {
                    if (hidden.has(item.index)) {
                      hidden.delete(item.index);
                    } else if (all.length - hidden.size > 1) {
                      hidden.add(item.index);
                    }
                    drawLegend();
                    drawPlot();
                  },
                },
                el('i', { class: 'swatch', style: 'background:' + item.color }),
                item.name,
              ),
            )
          : []),
      );
    }

    const toggle = el(
      'button',
      {
        type: 'button',
        class: 'btn small ghost',
        onclick: () => {
          showTable = !showTable;
          toggle.textContent = showTable ? 'Ver gráfico' : 'Ver tabela';
          drawPlot();
        },
      },
      'Ver tabela',
    );

    figure.prepend(
      el(
        'figcaption',
        { class: 'chart-head' },
        el('strong', {}, spec.title || ''),
        hasData ? toggle : null,
      ),
      legend,
      stage,
    );
    drawLegend();
    drawPlot();
    container.append(figure);
    return figure;
  }

  CF.charts = { render, register, types, svg, seriesColor };
})();
