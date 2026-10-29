(function () {
  // Busca e filtros da lista de lançamentos (sem DOM), testáveis com node --test.
  const EMPTY = { text: '', type: '', status: '', categoryId: '' };
  const NO_CATEGORY = '__none';
  const SUMMED = ['income', 'expense', 'investment'];

  // Minúsculas e sem acento: "Açaí" encontra "acai".
  function normalize(text) {
    return String(text || '')
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .trim();
  }

  function hasFilters(filters) {
    return Boolean(normalize(filters.text) || filters.type || filters.status || filters.categoryId);
  }

  // names: { category: Map(id -> nome), account: Map(id -> nome) }
  function searchableText(item, names) {
    return normalize(
      [
        item.description,
        item.notes,
        item.personName,
        names.category.get(item.categoryId),
        names.account.get(item.accountId),
        item.toAccountId && names.account.get(item.toAccountId),
      ]
        .filter(Boolean)
        .join(' '),
    );
  }

  // Todas as palavras digitadas precisam aparecer em algum campo do lançamento.
  function filterTransactions(items, filters, names) {
    const words = normalize(filters.text).split(/\s+/).filter(Boolean);
    return items.filter((item) => {
      if (filters.type && item.type !== filters.type) {
        return false;
      }
      if (filters.status && item.status !== filters.status) {
        return false;
      }
      if (filters.categoryId === NO_CATEGORY && item.categoryId) {
        return false;
      }
      if (
        filters.categoryId &&
        filters.categoryId !== NO_CATEGORY &&
        item.categoryId !== filters.categoryId
      ) {
        return false;
      }
      if (words.length) {
        const text = searchableText(item, names);
        return words.every((word) => text.includes(word));
      }
      return true;
    });
  }

  // Totais do que está na tela. Segue a regra do resumo do mês: só confirmados,
  // sem transferências e sem pagamento de fatura. Pendentes são só contados.
  function totals(items) {
    const sum = { count: items.length, income: 0, expense: 0, investment: 0, pending: 0 };
    for (const item of items) {
      if (item.status === 'pending') {
        sum.pending += 1;
      } else if (SUMMED.includes(item.type) && !item.invoicePayment) {
        sum[item.type] += item.amount;
      }
    }
    return sum;
  }

  const filters = { EMPTY, NO_CATEGORY, normalize, hasFilters, filterTransactions, totals };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = filters;
  } else {
    (window.CF = window.CF || {}).transactionFilters = filters;
  }
})();
