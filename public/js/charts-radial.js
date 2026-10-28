(function () {
  const { charts, chartsCore: core } = window.CF;
  const { svg } = charts;

  const clip = (text, max) => (text.length > max ? text.slice(0, max - 1) + '…' : text);

  // Pizza e rosca: cada categoria é uma fatia (vale a primeira série).
  function drawSlices(ctx, inner) {
    const { W, H, entities } = ctx;
    const cx = W / 2;
    const cy = H / 2;
    const radius = Math.min(W, H) / 2 - 34;
    const items = entities.map((item) => ({
      label: item.name,
      value: item.value,
      color: item.color,
    }));
    const slices = core.sliceAngles(items);
    const total = slices.reduce((sum, slice) => sum + slice.value, 0);
    const group = svg('g');

    for (const slice of slices) {
      group.append(
        svg('path', {
          d: core.arcPath(cx, cy, radius, inner, slice.from, slice.to),
          'stroke-width': 2,
          class: 'chart-slice',
          style: 'fill:' + slice.color,
          onmousemove: (event) =>
            ctx.tip.show(event, slice.label, [
              {
                color: slice.color,
                label: slice.percent.toLocaleString('pt-BR') + '%',
                value: ctx.format(slice.value),
              },
            ]),
        }),
      );
      // Percentual fora da fatia, em tinta de texto (nunca na cor da série).
      if (slice.percent >= 4) {
        const [x, y] = core.polar(cx, cy, radius + 16, (slice.from + slice.to) / 2);
        group.append(
          svg(
            'text',
            { x, y: y + 4, 'text-anchor': 'middle', class: 'chart-tick' },
            slice.percent.toLocaleString('pt-BR') + '%',
          ),
        );
      }
    }

    if (inner > 0) {
      group.append(
        svg('text', { x: cx, y: cy - 4, 'text-anchor': 'middle', class: 'chart-tick' }, 'Total'),
        svg(
          'text',
          { x: cx, y: cy + 16, 'text-anchor': 'middle', class: 'chart-center' },
          ctx.format(total),
        ),
      );
    }
    ctx.root.append(group);
  }

  // Radar: um eixo por categoria; bom para comparar perfis (ex.: dia da semana).
  function drawRadar(ctx) {
    const { W, H, entities, categories } = ctx;
    const cx = W / 2;
    const cy = H / 2 + 6;
    const radius = Math.min(W, H) / 2 - 52;
    const values = entities.flatMap((item) => item.values.filter((v) => v != null));
    const scale = core.niceScale(Math.max(...values, 0), 4);
    const group = svg('g');

    // Anéis de referência e eixos.
    const grid = svg('g', { class: 'chart-grid' });
    for (const tick of scale.ticks.slice(1)) {
      const ring = categories.map((_, i) => {
        const [x, y] = core.polar(
          cx,
          cy,
          (radius * tick) / scale.max,
          (i * Math.PI * 2) / categories.length,
        );
        return x.toFixed(1) + ',' + y.toFixed(1);
      });
      grid.append(svg('polygon', { points: ring.join(' '), fill: 'none' }));
    }
    categories.forEach((label, i) => {
      const angle = (i * Math.PI * 2) / categories.length;
      const [x, y] = core.polar(cx, cy, radius, angle);
      const [lx, ly] = core.polar(cx, cy, radius + 14, angle);
      grid.append(
        svg('line', { x1: cx, y1: cy, x2: x, y2: y }),
        svg(
          'text',
          {
            x: lx,
            y: ly + 4,
            'text-anchor': Math.abs(lx - cx) < 4 ? 'middle' : lx > cx ? 'start' : 'end',
            class: 'chart-tick',
          },
          clip(label, 14),
        ),
      );
    });
    group.append(grid);

    for (const item of entities) {
      const points = core.radarPoints(
        item.values.map((v) => v || 0),
        scale.max,
        cx,
        cy,
        radius,
      );
      group.append(
        svg('polygon', {
          points: points.map((p) => p.join(',')).join(' '),
          'fill-opacity': 0.16,
          'stroke-width': 2,
          'stroke-linejoin': 'round',
          style: 'fill:' + item.color + ';stroke:' + item.color,
        }),
      );
      points.forEach(([x, y], index) => {
        group.append(
          svg('circle', {
            cx: x,
            cy: y,
            r: 4,
            'stroke-width': 2,
            class: 'chart-dot',
            style: 'fill:' + item.color,
            onmousemove: (event) =>
              ctx.tip.show(event, categories[index], [
                { color: item.color, label: item.name, value: ctx.format(item.values[index] || 0) },
              ]),
          }),
        );
      });
    }
    ctx.root.append(group);
  }

  charts.register('pie', {
    label: 'Pizza',
    slices: true,
    draw: (ctx) => drawSlices(ctx, 0),
  });
  charts.register('donut', {
    label: 'Rosca',
    slices: true,
    draw: (ctx) => drawSlices(ctx, Math.min(ctx.W, ctx.H) / 2 - 34 - 46),
  });
  charts.register('radar', { label: 'Radar', draw: drawRadar, minCategories: 3 });
})();
