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
