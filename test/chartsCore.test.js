const { test } = require('node:test');
const assert = require('node:assert');
const core = require('../public/js/charts-core.js');

test('niceScale arredonda o máximo e gera linhas de grade', () => {
  assert.deepStrictEqual(core.niceScale(870, 4), {
    max: 1000,
    ticks: [0, 250, 500, 750, 1000],
  });
  const scale = core.niceScale(870, 4);
  assert.ok(scale.max >= 870);
  assert.strictEqual(scale.ticks[0], 0);
  assert.strictEqual(scale.ticks[scale.ticks.length - 1], scale.max);
});

test('niceScale trata zero e valores inválidos', () => {
  assert.deepStrictEqual(core.niceScale(0), { max: 1, ticks: [0, 1] });
  assert.deepStrictEqual(core.niceScale(NaN), { max: 1, ticks: [0, 1] });
});

test('niceRange inclui o zero e valores negativos', () => {
  const range = core.niceRange(-300, 900, 4);
  assert.ok(range.min <= -300);
  assert.ok(range.max >= 900);
  assert.ok(range.ticks.includes(0));
  const positive = core.niceRange(0, 500, 4);
  assert.strictEqual(positive.min, 0);
});

test('formatCompact abrevia valores em reais', () => {
  assert.strictEqual(core.formatCompact(50000), '500');
  assert.strictEqual(core.formatCompact(123456), '1,2 mil');
  assert.strictEqual(core.formatCompact(-250000), '-2,5 mil');
  assert.strictEqual(core.formatCompact(250000000), '2,5 mi');
});

test('scaleLinear mapeia o domínio e evita divisão por zero', () => {
  assert.strictEqual(core.scaleLinear(5, 0, 10, 0, 100), 50);
  assert.strictEqual(core.scaleLinear(0, 0, 10, 100, 0), 100);
  assert.strictEqual(core.scaleLinear(3, 3, 3, 10, 20), 10);
});

test('sliceAngles soma 100% e ignora zero e negativos', () => {
  const slices = core.sliceAngles([
    { label: 'A', value: 300 },
    { label: 'B', value: 100 },
    { label: 'C', value: 0 },
    { label: 'D', value: -5 },
  ]);
  assert.strictEqual(slices.length, 2);
  assert.strictEqual(slices[0].percent, 75);
  assert.strictEqual(slices[1].percent, 25);
  assert.ok(Math.abs(slices[1].to - Math.PI * 2) < 1e-9);
});

test('arcPath divide a fatia de 100% em duas metades', () => {
  const path = core.arcPath(50, 50, 40, 20, 0, Math.PI * 2);
  assert.strictEqual((path.match(/M/g) || []).length, 2);
  assert.ok(!path.includes('NaN'));
});

test('arcPath de pizza começa no centro', () => {
  const path = core.arcPath(50, 50, 40, 0, 0, Math.PI / 2);
  assert.ok(path.startsWith('M50 50 L'));
});

test('foldOther junta o excedente em "Outros"', () => {
  const items = Array.from({ length: 10 }, (_, i) => ({ label: 'C' + i, value: (i + 1) * 10 }));
  const folded = core.foldOther(items, 8);
  assert.strictEqual(folded.length, 8);
  assert.strictEqual(folded[7].label, 'Outros');
  assert.strictEqual(
    folded.reduce((sum, item) => sum + item.value, 0),
    items.reduce((sum, item) => sum + item.value, 0),
  );
  assert.strictEqual(folded[0].value, 100);
});

test('foldOther não altera listas pequenas e descarta zeros', () => {
  const folded = core.foldOther([
    { label: 'A', value: 5 },
    { label: 'B', value: 0 },
  ]);
  assert.deepStrictEqual(folded, [{ label: 'A', value: 5 }]);
});

test('linePoints e pathFromPoints interrompem o traço nos meses sem dado', () => {
  const points = core.linePoints([10, 20, null, 40], 0, 40, 0, 300, 0, 100);
  assert.strictEqual(points[2], null);
  assert.deepStrictEqual(points[0], [0, 75]);
  const paths = core.pathFromPoints(points);
  assert.strictEqual(paths.length, 2);
  assert.ok(paths[0].startsWith('M0 75 L'));
});

test('linePoints centraliza um ponto único', () => {
  assert.deepStrictEqual(core.linePoints([5], 0, 10, 0, 100, 0, 50), [[50, 25]]);
});

test('radarPoints usa um eixo por item, começando no topo', () => {
  const points = core.radarPoints([10, 10, 10, 10], 10, 100, 100, 50);
  assert.deepStrictEqual(points[0], [100, 50]);
  assert.deepStrictEqual(points[1], [150, 100]);
  assert.deepStrictEqual(core.radarPoints([5], 0, 0, 0, 10), [[0, 0]]);
});

test('movingAverage e cumulative', () => {
  assert.deepStrictEqual(core.movingAverage([10, 20, 30, 40], 2), [10, 15, 25, 35]);
  assert.deepStrictEqual(core.cumulative([5, 10, 0, 5]), [5, 15, 15, 20]);
});

test('polarRadii divide o círculo em partes iguais e usa a raiz do valor no raio', () => {
  const result = core.polarRadii(
    [
      { label: 'a', value: 100 },
      { label: 'b', value: 25 },
      { label: 'c', value: 0 },
    ],
    80,
  );
  assert.strictEqual(result.length, 2);
  assert.ok(Math.abs(result[0].to - Math.PI) < 1e-9);
  assert.strictEqual(result[0].radius, 80);
  assert.strictEqual(result[1].radius, 40);
  assert.deepStrictEqual(core.polarRadii([], 80), []);
});

test('funnelBars centraliza as barras, do maior para o menor', () => {
  const bars = core.funnelBars(
    [
      { label: 'b', value: 50 },
      { label: 'a', value: 100 },
    ],
    200,
    100,
    10,
  );
  assert.strictEqual(bars[0].label, 'a');
  assert.strictEqual(bars[0].width, 200);
  assert.strictEqual(bars[0].x, 0);
  assert.strictEqual(bars[1].width, 100);
  assert.strictEqual(bars[1].x, 50);
  assert.strictEqual(bars[1].percent, 50);
  assert.strictEqual(bars[1].y, bars[0].height + 10);
  assert.deepStrictEqual(core.funnelBars([{ label: 'x', value: 0 }], 100, 50), []);
});

test('treemapLayout preenche o retângulo com áreas proporcionais ao valor', () => {
  const items = [
    { label: 'a', value: 6 },
    { label: 'b', value: 6 },
    { label: 'c', value: 4 },
    { label: 'd', value: 3 },
    { label: 'e', value: 2 },
    { label: 'f', value: 2 },
    { label: 'g', value: 1 },
  ];
  const rects = core.treemapLayout(items, 600, 400);
  assert.strictEqual(rects.length, items.length);
  const area = rects.reduce((sum, r) => sum + r.w * r.h, 0);
  assert.ok(Math.abs(area - 600 * 400) < 50, 'a soma das áreas cobre o retângulo');
  const total = items.reduce((sum, item) => sum + item.value, 0);
  for (const rect of rects) {
    assert.ok(rect.x >= -0.01 && rect.y >= -0.01);
    assert.ok(rect.x + rect.w <= 600.05 && rect.y + rect.h <= 400.05);
    const expected = (rect.value / total) * 600 * 400;
    assert.ok(Math.abs(rect.w * rect.h - expected) < 20, rect.label);
  }
  assert.deepStrictEqual(core.treemapLayout([], 100, 100), []);
  assert.deepStrictEqual(core.treemapLayout(items, 0, 100), []);
});

test('waterfallSteps acumula os valores e fecha com a barra de total', () => {
  const steps = core.waterfallSteps([1000, -300, -200]);
  assert.deepStrictEqual(
    steps.map((s) => [s.start, s.end, s.kind]),
    [
      [0, 1000, 'up'],
      [1000, 700, 'down'],
      [700, 500, 'down'],
      [0, 500, 'total'],
    ],
  );
  const deficit = core.waterfallSteps([100, -300]);
  assert.strictEqual(deficit[2].end, -200);
});

test('heatLevel vai de 0 (sem valor) ao nível máximo', () => {
  assert.strictEqual(core.heatLevel(0, 100), 0);
  assert.strictEqual(core.heatLevel(-5, 100), 0);
  assert.strictEqual(core.heatLevel(10, 0), 0);
  assert.strictEqual(core.heatLevel(1, 100), 1);
  assert.strictEqual(core.heatLevel(50, 100), 2);
  assert.strictEqual(core.heatLevel(100, 100), 4);
});

test('calendarGrid monta semanas de domingo a sábado', () => {
  // 1º de outubro de 2026 cai numa quinta-feira.
  const weeks = core.calendarGrid('2026-10');
  assert.strictEqual(weeks.length, 5);
  assert.ok(weeks.every((week) => week.length === 7));
  assert.deepStrictEqual(weeks[0], [null, null, null, null, 1, 2, 3]);
  assert.strictEqual(weeks[4][6], 31);
  assert.strictEqual(weeks.flat().filter(Boolean).length, 31);
  // Fevereiro de 2026 começa num domingo e tem 28 dias: exatamente 4 semanas.
  assert.strictEqual(core.calendarGrid('2026-02').length, 4);
});
