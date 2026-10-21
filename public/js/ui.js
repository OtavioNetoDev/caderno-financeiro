(function () {
  const CF = (window.CF = window.CF || {});

  // Cria elementos do DOM sem innerHTML (o conteúdo vira texto, o que evita XSS).
  CF.el = function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'class') {
        node.className = value;
      } else if (key.startsWith('on')) {
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
  };
})();
