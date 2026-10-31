(function () {
  // A API entrega no máximo 200 lançamentos por página. Esta função busca todas as páginas
  // (até maxPages) para a tela não mostrar só os primeiros itens de um mês cheio.
  // fetchPage(page) deve devolver { items, total }.
  async function fetchAllPages(fetchPage, { maxPages = 10 } = {}) {
    const items = [];
    let total = 0;
    for (let page = 1; page <= maxPages; page += 1) {
      const data = await fetchPage(page);
      total = data.total;
      items.push(...data.items);
      if (!data.items.length || items.length >= total) {
        break;
      }
    }
    return { items, total, truncated: items.length < total };
  }

  const paging = { fetchAllPages };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = paging;
  } else {
    (window.CF = window.CF || {}).paging = paging;
  }
})();
