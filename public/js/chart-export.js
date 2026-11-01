(function () {
  const NS = 'http://www.w3.org/2000/svg'\;
  const SCALE = 2;
  const STYLE_PROPS = [
    'fill',
    'fill-opacity',
    'stroke',
    'stroke-width',
    'stroke-opacity',
    'stroke-dasharray',
    'opacity',
    'font-family',
    'font-size',
    'font-weight',
    'text-anchor',
  ];

  // "Despesas por categoria" vira "despesas-por-categoria" (nome do arquivo baixado).
  function slugify(text) {
    const slug = String(text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug || 'grafico';
  }

  // O gráfico usa variáveis de CSS (var(--series-1)); na imagem elas precisam virar cores fixas.
  function inlineStyles(source, copy) {
    const from = [source, ...source.querySelectorAll('*')];
    const to = [copy, ...copy.querySelectorAll('*')];
    from.forEach((node, index) => {
      const computed = getComputedStyle(node);
      const css = STYLE_PROPS.map((prop) => prop + ':' + computed.getPropertyValue(prop)).join(';');
      to[index].setAttribute('style', css);
    });
  }

  function toPngBlob(svgNode) {
    const { width, height } = svgNode.viewBox.baseVal;
    const copy = svgNode.cloneNode(true);
    inlineStyles(svgNode, copy);
    copy.setAttribute('xmlns', NS);
    copy.setAttribute('width', width * SCALE);
    copy.setAttribute('height', height * SCALE);

    const background = document.createElementNS(NS, 'rect');
    background.setAttribute('width', '100%');
    background.setAttribute('height', '100%');
    background.setAttribute(
      'fill',
      getComputedStyle(document.body).getPropertyValue('--surface-solid').trim() || '#ffffff',
    );
    copy.insertBefore(background, copy.firstChild);

    const xml = new XMLSerializer().serializeToString(copy);
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width * SCALE;
        canvas.height = height * SCALE;
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Não foi possível gerar a imagem.'))),
          'image/png',
        );
      };
      image.onerror = () => reject(new Error('Não foi possível gerar a imagem.'));
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
    });
  }

  function save(blob, fileName) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  // Botão "Baixar PNG". getSvg devolve o SVG que está na tela (ou null, na visão em tabela).
  function button(getSvg, title) {
    const { el } = window.CF;
    const action = el(
      'button',
      {
        type: 'button',
        class: 'btn small ghost',
        title: 'Baixar este gráfico como imagem',
        onclick: async () => {
          const node = getSvg();
          if (!node) {
            return;
          }
          try {
            save(await toPngBlob(node), slugify(title) + '.png');
          } catch (err) {
            action.title = err.message;
          }
        },
      },
      'Baixar PNG',
    );
    return action;
  }

  const chartExport = { slugify, button };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = chartExport;
  } else {
    (window.CF = window.CF || {}).chartExport = chartExport;
  }
})();
