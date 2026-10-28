(function () {
  const { charts, chartsCore: core } = window.CF;
  const { svg } = charts;

  // Linhas e áreas compartilham a mesma lógica; a área só acrescenta o preenchimento.
  function drawLines(ctx, withArea) {
    const { m, plotW, plotH, entities, categories } = ctx;
    const values = entities.flatMap((item) => item.values.filter((v) => v != null));
    const range = core.niceRange(Math.min(...values, 0), Math.max(...values, 0));
    const toY = ctx.drawYAxis(range);

    const band = plotW / categories.length;
    const left = m.left + band / 2;
    const right = m.left + plotW - band / 2;
    const xs = categories.map((_, i) =>
      categories.length === 1
        ? m.left + plotW / 2
        : core.scaleLinear(i, 0, categories.length - 1, left, right),
    );
    ctx.drawXLabels(xs);

    const zero = toY(0);
    const bottom = m.top + plotH;
    const group = svg('g');
    const dots = entities.map(() => []);

    entities.forEach((item, position) => {
      const points = core.linePoints(item.values, range.min, range.max, left, right, m.top, bottom);
      const paths = core.pathFromPoints(points);
      if (withArea) {
        // Cada trecho contínuo vira um polígono fechado na linha do zero.
        let run = [];
        const flush = () => {
          if (run.length) {
            const first = run[0];
            const last = run[run.length - 1];
            const d =
              run.map(([x, y], i) => (i ? 'L' : 'M') + x + ' ' + y).join(' ') +
              ` L${last[0]} ${zero} L${first[0]} ${zero} Z`;
            group.append(svg('path', { d, style: 'fill:' + item.color, 'fill-opacity': 0.16 }));
          }
          run = [];
        };
        for (const point of points) {
          if (point) run.push(point);
          else flush();
        }
        flush();
      }
      for (const d of paths) {
        group.append(
          svg('path', {
            d,
            fill: 'none',
            'stroke-width': 2,
            'stroke-linejoin': 'round',
            'stroke-linecap': 'round',
            style: 'stroke:' + item.color,
          }),
        );
      }
      // Marcadores só quando há poucos pontos; com muitos, o cursor destaca o ponto.
      points.forEach((point, index) => {
        if (!point) return;
        const dot = svg('circle', {
          cx: point[0],
          cy: point[1],
          r: categories.length <= 14 ? 4 : 0,
          'stroke-width': 2,
          class: 'chart-dot',
          style: 'fill:' + item.color,
        });
        dots[position][index] = dot;
        group.append(dot);
      });
    });

    const cursor = svg('line', {
      y1: m.top,
      y2: bottom,
      class: 'chart-cursor',
      visibility: 'hidden',
    });
    group.append(cursor);

    const move = (event) => {
      const box = ctx.root.getBoundingClientRect();
      const x = ((event.clientX - box.left) / box.width) * ctx.W;
      let nearest = 0;
      xs.forEach((value, i) => {
        if (Math.abs(value - x) < Math.abs(xs[nearest] - x)) nearest = i;
      });
      cursor.setAttribute('x1', xs[nearest]);
      cursor.setAttribute('x2', xs[nearest]);
      cursor.setAttribute('visibility', 'visible');
      dots.forEach((row) =>
        row.forEach((dot, i) =>
          dot.setAttribute('r', i === nearest ? 5 : categories.length <= 14 ? 4 : 0),
        ),
      );
      ctx.tip.show(
        event,
        categories[nearest],
        entities.map((item) => ({
          color: item.color,
          label: item.name,
          value: item.values[nearest] == null ? '-' : ctx.format(item.values[nearest]),
        })),
      );
    };
    const leave = () => {
      cursor.setAttribute('visibility', 'hidden');
      dots.forEach((row) =>
        row.forEach((dot) => dot.setAttribute('r', categories.length <= 14 ? 4 : 0)),
      );
    };
    group.append(
      svg('rect', {
        x: m.left,
        y: m.top,
        width: plotW,
        height: plotH,
        fill: 'transparent',
        onmousemove: move,
        onmouseleave: leave,
      }),
    );
    ctx.root.append(group);
  }

  charts.register('line', { label: 'Linhas', draw: (ctx) => drawLines(ctx, false) });
  charts.register('area', { label: 'Área', draw: (ctx) => drawLines(ctx, true) });
})();
