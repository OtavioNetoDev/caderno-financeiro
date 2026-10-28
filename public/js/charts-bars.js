(function () {
  const { charts, chartsCore: core } = window.CF;
  const { svg } = charts;

  const GAP = 2; // espaço entre barras vizinhas
  const clip = (text, max) => (text.length > max ? text.slice(0, max - 1) + '…' : text);

  function allValues(entities) {
    return entities.flatMap((item) => item.values.filter((v) => v != null));
  }

  // Zona invisível maior que a barra, para o mouse acertar com facilidade.
  function hoverBand(ctx, x, y, w, h, index) {
    return svg('rect', {
      x,
      y,
      width: w,
      height: h,
      fill: 'transparent',
      onmousemove: (event) =>
        ctx.tip.show(
          event,
          ctx.categories[index],
          ctx.entities.map((item) => ({
            color: item.color,
            label: item.name,
            value: item.values[index] == null ? '-' : ctx.format(item.values[index]),
          })),
        ),
    });
  }

  // Colunas agrupadas: uma coluna por série em cada categoria (aceita valores negativos).
  function drawBars(ctx) {
    const values = allValues(ctx.entities);
    const range = core.niceRange(Math.min(...values, 0), Math.max(...values, 0));
    const toY = ctx.drawYAxis(range);
    const { m, plotW, entities, categories } = ctx;
    const band = plotW / categories.length;
    const barW = Math.max(2, (band * 0.72) / entities.length - GAP);
    const groupW = entities.length * (barW + GAP) - GAP;
    const zero = toY(0);
    const centers = [];
    const marks = svg('g');

    categories.forEach((_, index) => {
      const left = m.left + band * index + (band - groupW) / 2;
      centers.push(m.left + band * index + band / 2);
      entities.forEach((item, position) => {
        const value = item.values[index];
        if (!value) {
          return;
        }
        const y = Math.min(toY(value), zero);
        marks.append(
          svg('rect', {
            x: left + position * (barW + GAP),
            y,
            width: barW,
            height: Math.max(1, Math.abs(toY(value) - zero)),
            rx: 3,
            style: 'fill:' + item.color,
          }),
        );
      });
      marks.append(hoverBand(ctx, m.left + band * index, m.top, band, ctx.plotH, index));
    });
    ctx.root.append(marks);
    ctx.drawXLabels(centers);
  }

  // Colunas empilhadas: o total da categoria aparece como soma das séries (só valores positivos).
  function drawStacked(ctx) {
    const { m, plotW, entities, categories } = ctx;
    const totals = categories.map((_, i) =>
      entities.reduce((sum, item) => sum + Math.max(0, item.values[i] || 0), 0),
    );
    const range = core.niceRange(0, Math.max(...totals, 0));
    const toY = ctx.drawYAxis(range);
    const band = plotW / categories.length;
    const barW = Math.max(4, band * 0.6);
    const centers = [];
    const marks = svg('g');

    categories.forEach((_, index) => {
      const x = m.left + band * index + (band - barW) / 2;
      centers.push(m.left + band * index + band / 2);
      let base = 0;
      entities.forEach((item) => {
        const value = Math.max(0, item.values[index] || 0);
        if (!value) {
          return;
        }
        const top = toY(base + value);
        const bottom = toY(base);
        // Fresta de 2px entre os segmentos, para as cores não se misturarem.
        marks.append(
          svg('rect', {
            x,
            y: top,
            width: barW,
            height: Math.max(1, bottom - top - GAP),
            rx: 2,
            style: 'fill:' + item.color,
          }),
        );
        base += value;
      });
      marks.append(hoverBand(ctx, m.left + band * index, m.top, band, ctx.plotH, index));
    });
    ctx.root.append(marks);
    ctx.drawXLabels(centers);
  }

  // Barras horizontais: ótimas para ranking (categorias com nomes longos).
  function drawHorizontal(ctx) {
    const { m, plotW, plotH: height, entities, categories } = ctx;
    const values = allValues(entities);
    const range = core.niceScale(Math.max(...values, 0));
    const band = height / categories.length;
    const barH = Math.max(3, Math.min(22, (band * 0.7) / entities.length - GAP));
    const groupH = entities.length * (barH + GAP) - GAP;
    const toX = (value) => core.scaleLinear(value, 0, range.max, m.left, m.left + plotW);
    const grid = svg('g', { class: 'chart-grid' });
    for (const tick of range.ticks) {
      grid.append(
        svg('line', { x1: toX(tick), x2: toX(tick), y1: m.top, y2: m.top + height }),
        svg(
          'text',
          { x: toX(tick), y: m.top + height + 18, 'text-anchor': 'middle', class: 'chart-tick' },
          ctx.axisFormat(tick),
        ),
      );
    }
    ctx.root.append(grid);

    const marks = svg('g');
    categories.forEach((label, index) => {
      const top = m.top + band * index + (band - groupH) / 2;
      marks.append(
        svg(
          'text',
          {
            x: m.left - 8,
            y: m.top + band * index + band / 2 + 4,
            'text-anchor': 'end',
            class: 'chart-tick',
          },
          clip(label, 16),
        ),
      );
      entities.forEach((item, position) => {
        const value = item.values[index];
        if (!value || value <= 0) {
          return;
        }
        marks.append(
          svg('rect', {
            x: m.left,
            y: top + position * (barH + GAP),
            width: Math.max(2, toX(value) - m.left),
            height: barH,
            rx: 3,
            style: 'fill:' + item.color,
          }),
        );
      });
      marks.append(hoverBand(ctx, m.left, m.top + band * index, plotW, band, index));
    });
    ctx.root.append(marks);
  }

  charts.register('bar', { label: 'Colunas', draw: drawBars });
  charts.register('stacked', { label: 'Colunas empilhadas', draw: drawStacked });
  charts.register('hbar', {
    label: 'Barras horizontais',
    draw: drawHorizontal,
    margin: { top: 16, right: 24, bottom: 36, left: 120 },
  });
})();
