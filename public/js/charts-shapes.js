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
})();
