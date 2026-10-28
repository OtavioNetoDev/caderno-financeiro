(function () {
  // Cálculos puros dos gráficos (sem DOM), para poderem ser testados com `node --test`.

  // Paleta categórica de 8 cores, validada para daltonismo nos modos claro e escuro.
  // A cor segue a posição da série; a nona série em diante vira "Outros".
  const PALETTE_SIZE = 8;

  // Escala "bonita" para o eixo: devolve o máximo arredondado e os valores das linhas de grade.
  function niceScale(max, ticks = 4) {
    if (!Number.isFinite(max) || max <= 0) {
      return { max: 1, ticks: [0, 1] };
    }
    const rough = max / ticks;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
    const fraction = rough / magnitude;
    let step;
    if (fraction <= 1) step = 1;
    else if (fraction <= 2) step = 2;
    else if (fraction <= 2.5) step = 2.5;
    else if (fraction <= 5) step = 5;
    else step = 10;
    step *= magnitude;
    const top = Math.ceil(max / step) * step;
    const values = [];
    for (let value = 0; value <= top + step / 1000; value += step) {
      values.push(Math.round(value * 1e6) / 1e6);
    }
    return { max: top, ticks: values };
  }

  // Escala que aceita valores negativos (ex.: lucro): { min, max, ticks }.
  function niceRange(min, max, ticks = 4) {
    const low = Math.min(0, min);
    const high = Math.max(0, max);
    if (low === 0) {
      return { min: 0, ...niceScale(high, ticks) };
    }
    const span = niceScale(Math.max(high, -low) * 2, ticks * 2);
    const step = span.ticks.length > 1 ? span.ticks[1] : 1;
    const bottom = Math.floor(low / step) * step;
    const top = Math.max(Math.ceil(high / step) * step, step);
    const values = [];
    for (let value = bottom; value <= top + step / 1000; value += step) {
      values.push(Math.round(value * 1e6) / 1e6);
    }
    return { min: bottom, max: top, ticks: values };
  }

  // Valor compacto para eixos, em centavos: 123456 -> "1,2 mil" (já em reais).
  function formatCompact(cents) {
    const reais = Math.abs(cents) / 100;
    const sign = cents < 0 ? '-' : '';
    const fmt = (n) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    if (reais >= 1e6) return sign + fmt(reais / 1e6) + ' mi';
    if (reais >= 1e3) return sign + fmt(reais / 1e3) + ' mil';
    return sign + fmt(reais);
  }

  // Mapeia um valor do domínio [min, max] para uma posição entre `start` e `end`.
  function scaleLinear(value, min, max, start, end) {
    if (max === min) {
      return start;
    }
    return start + ((value - min) / (max - min)) * (end - start);
  }

  // Ângulo 0 = topo, sentido horário. Devolve [x, y].
  function polar(cx, cy, radius, angle) {
    return [cx + radius * Math.sin(angle), cy - radius * Math.cos(angle)];
  }

  const round = (n) => Math.round(n * 100) / 100;

  // Caminho SVG de uma fatia (pizza quando inner = 0, rosca quando inner > 0).
  function arcPath(cx, cy, outer, inner, from, to) {
    // Uma fatia de 100% não pode ser um arco só; divide em duas metades.
    if (to - from >= Math.PI * 2 - 1e-6) {
      const mid = from + Math.PI;
      return (
        arcPath(cx, cy, outer, inner, from, mid) + ' ' + arcPath(cx, cy, outer, inner, mid, to)
      );
    }
    const large = to - from > Math.PI ? 1 : 0;
    const [x1, y1] = polar(cx, cy, outer, from);
    const [x2, y2] = polar(cx, cy, outer, to);
    if (inner <= 0) {
      return `M${round(cx)} ${round(cy)} L${round(x1)} ${round(y1)} A${outer} ${outer} 0 ${large} 1 ${round(x2)} ${round(y2)} Z`;
    }
    const [x3, y3] = polar(cx, cy, inner, to);
    const [x4, y4] = polar(cx, cy, inner, from);
    return `M${round(x1)} ${round(y1)} A${outer} ${outer} 0 ${large} 1 ${round(x2)} ${round(y2)} L${round(x3)} ${round(y3)} A${inner} ${inner} 0 ${large} 0 ${round(x4)} ${round(y4)} Z`;
  }

  // Divide os itens [{ label, value }] em fatias com ângulo e percentual. Ignora zero e negativo.
  function sliceAngles(items) {
    const valid = items.filter((item) => item.value > 0);
    const total = valid.reduce((sum, item) => sum + item.value, 0);
    let angle = 0;
    return valid.map((item) => {
      const share = total > 0 ? item.value / total : 0;
      const slice = {
        ...item,
        percent: Math.round(share * 1000) / 10,
        from: angle,
        to: angle + share * Math.PI * 2,
      };
      angle = slice.to;
      return slice;
    });
  }

  // Mantém as `limit - 1` maiores e junta o resto em "Outros".
  function foldOther(items, limit = PALETTE_SIZE, label = 'Outros') {
    const sorted = items.filter((item) => item.value > 0).sort((a, b) => b.value - a.value);
    if (sorted.length <= limit) {
      return sorted;
    }
    const head = sorted.slice(0, limit - 1);
    const rest = sorted.slice(limit - 1).reduce((sum, item) => sum + item.value, 0);
    return [...head, { label, value: rest }];
  }

  // Pontos de uma linha: values pode ter null (mês sem dado) e o traço é interrompido.
  function linePoints(values, min, max, left, right, top, bottom) {
    const count = values.length;
    return values.map((value, index) => {
      if (value == null) {
        return null;
      }
      const x = count === 1 ? (left + right) / 2 : scaleLinear(index, 0, count - 1, left, right);
      return [round(x), round(scaleLinear(value, min, max, bottom, top))];
    });
  }

  // Transforma os pontos em caminhos "M..L.." separando os trechos interrompidos.
  function pathFromPoints(points) {
    const segments = [];
    let current = [];
    for (const point of points) {
      if (point) {
        current.push(point);
      } else if (current.length) {
        segments.push(current);
        current = [];
      }
    }
    if (current.length) {
      segments.push(current);
    }
    return segments.map((seg) => seg.map(([x, y], i) => (i ? 'L' : 'M') + x + ' ' + y).join(' '));
  }

  // Pontos do polígono do radar: values entre 0 e max, um eixo por item.
  function radarPoints(values, max, cx, cy, radius) {
    const step = (Math.PI * 2) / values.length;
    return values.map((value, index) => {
      const ratio = max > 0 ? Math.max(0, value) / max : 0;
      const [x, y] = polar(cx, cy, radius * ratio, index * step);
      return [round(x), round(y)];
    });
  }

  // Média móvel simples (para suavizar linhas diárias).
  function movingAverage(values, window = 7) {
    return values.map((_, index) => {
      const slice = values.slice(Math.max(0, index - window + 1), index + 1);
      return Math.round(slice.reduce((sum, v) => sum + v, 0) / slice.length);
    });
  }

  // Soma acumulada (para o gráfico de evolução do mês).
  function cumulative(values) {
    let sum = 0;
    return values.map((value) => (sum += value));
  }

  const core = {
    PALETTE_SIZE,
    niceScale,
    niceRange,
    formatCompact,
    scaleLinear,
    polar,
    arcPath,
    sliceAngles,
    foldOther,
    linePoints,
    pathFromPoints,
    radarPoints,
    movingAverage,
    cumulative,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = core;
  } else {
    (window.CF = window.CF || {}).chartsCore = core;
  }
})();
