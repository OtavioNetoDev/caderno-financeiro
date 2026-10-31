(function () {
  const { charts, chartsCore: core } = window.CF;
  const { svg } = charts;

  const clip = (text, max) => (text.length > max ? text.slice(0, max - 1) + '…' : text);
  const percentText = (value) => value.toLocaleString('pt-BR') + '%';

  const itemsOf = (ctx) =>
    ctx.entities.map((item) => ({ label: item.name, value: item.value, color: item.color }));

  // Área polar: parecida com a pizza, mas todas as fatias têm o mesmo ângulo e o raio mostra o valor.
  function drawPolar(ctx) {
    const { W, H } = ctx;
    const cx = W / 2;
    const cy = H / 2;
    const radius = Math.min(W, H) / 2 - 40;
    const slices = core.polarRadii(itemsOf(ctx), radius);
    const total = slices.reduce((sum, slice) => sum + slice.value, 0);
    const group = svg('g');

    const rings = svg('g', { class: 'chart-grid' });
    for (const ratio of [1 / 3, 2 / 3, 1]) {
      rings.append(svg('circle', { cx, cy, r: radius * ratio, fill: 'none' }));
    }
    group.append(rings);

    for (const slice of slices) {
      const share = total > 0 ? Math.round((slice.value / total) * 1000) / 10 : 0;
      group.append(
        svg('path', {
          d: core.arcPath(cx, cy, slice.radius, 0, slice.from, slice.to),
          'stroke-width': 2,
          class: 'chart-slice',
          style: 'fill:' + slice.color,
          onmousemove: (event) =>
            ctx.tip.show(event, slice.label, [
              { color: slice.color, label: percentText(share), value: ctx.format(slice.value) },
            ]),
        }),
      );
      if (slices.length <= 12) {
        const [x, y] = core.polar(cx, cy, radius + 14, (slice.from + slice.to) / 2);
        group.append(
          svg(
            'text',
            {
              x,
              y: y + 4,
              'text-anchor': Math.abs(x - cx) < 4 ? 'middle' : x > cx ? 'start' : 'end',
              class: 'chart-tick',
            },
            clip(slice.label, 12),
          ),
        );
      }
    }
    ctx.root.append(group);
  }

  // Funil: etapas centralizadas, da maior para a menor, com o percentual sobre a primeira.
  function drawFunnel(ctx) {
    const { m, plotW, plotH } = ctx;
    const bars = core.funnelBars(itemsOf(ctx), plotW, plotH, 8);
    const group = svg('g');
    for (const bar of bars) {
      group.append(
        svg('rect', {
          x: m.left + bar.x,
          y: m.top + bar.y,
          width: bar.width,
          height: bar.height,
          rx: 4,
          style: 'fill:' + bar.color,
          onmousemove: (event) =>
            ctx.tip.show(event, bar.label, [
              { color: bar.color, label: percentText(bar.percent), value: ctx.format(bar.value) },
            ]),
        }),
        svg(
          'text',
          {
            x: m.left + plotW / 2,
            y: m.top + bar.y + bar.height / 2 + 4,
            'text-anchor': 'middle',
            class: 'chart-label',
          },
          clip(bar.label, 22) + ' · ' + ctx.format(bar.value),
        ),
      );
    }
    ctx.root.append(group);
  }

  // Treemap: cada item vira um retângulo com área proporcional ao valor.
  function drawTreemap(ctx) {
    const { m, plotW, plotH } = ctx;
    const rects = core.treemapLayout(itemsOf(ctx), plotW, plotH);
    const total = rects.reduce((sum, rect) => sum + rect.value, 0);
    const group = svg('g');
    for (const rect of rects) {
      const share = total > 0 ? Math.round((rect.value / total) * 1000) / 10 : 0;
      const x = m.left + rect.x;
      const y = m.top + rect.y;
      group.append(
        svg('rect', {
          x,
          y,
          width: rect.w,
          height: rect.h,
          rx: 4,
          'stroke-width': 2,
          class: 'chart-slice',
          style: 'fill:' + rect.color,
          onmousemove: (event) =>
            ctx.tip.show(event, rect.label, [
              { color: rect.color, label: percentText(share), value: ctx.format(rect.value) },
            ]),
        }),
      );
      if (rect.w > 64 && rect.h > 30) {
        const fits = Math.max(4, Math.floor((rect.w - 12) / 6.5));
        group.append(
          svg('text', { x: x + 8, y: y + 18, class: 'chart-label' }, clip(rect.label, fits)),
        );
        if (rect.h > 50) {
          group.append(
            svg('text', { x: x + 8, y: y + 34, class: 'chart-label' }, ctx.format(rect.value)),
          );
        }
      }
    }
    ctx.root.append(group);
  }

  // Cascata: parte de zero, soma cada item (sobe ou desce) e fecha com a barra do resultado.
  function drawWaterfall(ctx) {
    const { m, plotW, plotH, entities } = ctx;
    const steps = core.waterfallSteps(entities.map((item) => item.value));
    const labels = [...entities.map((item) => item.name), 'Resultado'];
    const edges = steps.flatMap((step) => [step.start, step.end]);
    const range = core.niceRange(Math.min(...edges, 0), Math.max(...edges, 0));
    const toY = ctx.drawYAxis(range);
    const band = plotW / steps.length;
    const barW = Math.max(6, band * 0.6);
    const colors = { up: 'var(--series-3)', down: 'var(--series-2)', total: 'var(--series-7)' };
    const group = svg('g');

    steps.forEach((step, index) => {
      const x = m.left + band * index + (band - barW) / 2;
      const top = Math.min(toY(step.start), toY(step.end));
      const color = colors[step.kind];
      if (index > 0) {
        const previous = steps[index - 1];
        group.append(
          svg('line', {
            x1: x - (band - barW),
            x2: x,
            y1: toY(previous.end),
            y2: toY(previous.end),
            class: 'chart-cursor',
          }),
        );
      }
      group.append(
        svg('rect', {
          x,
          y: top,
          width: barW,
          height: Math.max(1, Math.abs(toY(step.end) - toY(step.start))),
          rx: 3,
          style: 'fill:' + color,
          onmousemove: (event) =>
            ctx.tip.show(event, labels[index], [
              {
                color,
                label: step.kind === 'total' ? 'Resultado' : 'Valor',
                value: ctx.format(step.value),
              },
              ...(step.kind === 'total'
                ? []
                : [{ color, label: 'Acumulado', value: ctx.format(step.end) }]),
            ]),
        }),
        svg(
          'text',
          {
            x: m.left + band * index + band / 2,
            y: m.top + plotH + 20,
            'text-anchor': 'middle',
            class: 'chart-tick',
          },
          clip(labels[index], Math.max(5, Math.floor(band / 7))),
        ),
      );
      if (steps.length <= 8) {
        group.append(
          svg(
            'text',
            {
              x: m.left + band * index + band / 2,
              y: top - 6,
              'text-anchor': 'middle',
              class: 'chart-label',
            },
            ctx.format(step.value),
          ),
        );
      }
    });
    ctx.root.append(group);
  }

  const LEVEL_OPACITY = [0.14, 0.32, 0.52, 0.75, 1];

  // Mapa de calor: calendário do mês quando o gráfico informa o mês; senão, uma grade de blocos.
  function drawHeatmap(ctx) {
    const { m, plotW, plotH, entities, spec } = ctx;
    const color = (spec.series[0] && spec.series[0].color) || 'var(--series-1)';
    const max = Math.max(...entities.map((item) => item.value), 0);
    const byName = new Map(entities.map((item) => [item.name, item.value]));
    const group = svg('g');

    const cell = (x, y, w, h, label, value, text) => {
      const level = core.heatLevel(value, max, 4);
      group.append(
        svg('rect', {
          x,
          y,
          width: Math.max(1, w - 4),
          height: Math.max(1, h - 4),
          rx: 5,
          class: 'chart-slice',
          'stroke-width': 0,
          style: 'fill:' + color + ';fill-opacity:' + LEVEL_OPACITY[level],
          onmousemove: (event) =>
            ctx.tip.show(event, label, [{ color, label: 'Total', value: ctx.format(value) }]),
        }),
        svg(
          'text',
          {
            x: x + (w - 4) / 2,
            y: y + (h - 4) / 2 + 4,
            'text-anchor': 'middle',
            class: 'chart-label',
          },
          text,
        ),
      );
    };

    if (/^\d{4}-\d{2}$/.test(spec.month || '')) {
      const weeks = core.calendarGrid(spec.month);
      const cw = Math.min(plotW / 7, 84);
      const ch = Math.min((plotH - 18) / weeks.length, 52);
      const left = m.left + (plotW - cw * 7) / 2;
      ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].forEach((letter, column) =>
        group.append(
          svg(
            'text',
            {
              x: left + cw * column + cw / 2,
              y: m.top + 10,
              'text-anchor': 'middle',
              class: 'chart-tick',
            },
            letter,
          ),
        ),
      );
      weeks.forEach((week, row) =>
        week.forEach((day, column) => {
          if (day) {
            cell(
              left + cw * column,
              m.top + 18 + ch * row,
              cw,
              ch,
              'Dia ' + day,
              byName.get(String(day)) || 0,
              day,
            );
          }
        }),
      );
    } else {
      const count = entities.length;
      const columns = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / columns);
      const cw = Math.min(plotW / columns, 120);
      const ch = Math.min(plotH / rows, 64);
      const left = m.left + (plotW - cw * columns) / 2;
      entities.forEach((item, index) =>
        cell(
          left + cw * (index % columns),
          m.top + ch * Math.floor(index / columns),
          cw,
          ch,
          item.name,
          item.value,
          clip(item.name, Math.max(4, Math.floor(cw / 7))),
        ),
      );
    }
    ctx.root.append(group);
  }

  const edge = { top: 16, right: 16, bottom: 16, left: 16 };

  charts.register('polar', {
    label: 'Área polar',
    slices: true,
    minCategories: 3,
    draw: drawPolar,
  });
  charts.register('funnel', {
    label: 'Funil',
    slices: true,
    noLegend: true,
    margin: edge,
    draw: drawFunnel,
  });
  charts.register('treemap', {
    label: 'Treemap',
    slices: true,
    noLegend: true,
    margin: edge,
    draw: drawTreemap,
  });
  charts.register('waterfall', {
    label: 'Cascata',
    slices: true,
    noLegend: true,
    draw: drawWaterfall,
  });
  charts.register('heatmap', {
    label: 'Mapa de calor',
    slices: true,
    noLegend: true,
    margin: edge,
    draw: drawHeatmap,
  });
})();
