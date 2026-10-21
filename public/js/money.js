(function () {
  const TZ = 'America/Bahia';

  // "12,50" -> 1250 | "R$ 1.234,56" -> 123456 | "12.5" -> 1250 | "1.234" -> 123400
  function parseMoney(input) {
    if (typeof input !== 'string') {
      return null;
    }
    let text = input.replace(/R\$|\s/g, '');
    if (!/^\d[\d.,]*$/.test(text)) {
      return null;
    }
    if (text.includes(',')) {
      text = text.replace(/\./g, '').replace(',', '.');
    } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
      text = text.replace(/\./g, '');
    }
    const value = Number(text);
    return Number.isFinite(value) ? Math.round(Number((value * 100).toFixed(6))) : null;
  }

  function formatMoney(cents) {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('pt-BR', { timeZone: TZ });
  }

  function todayISO() {
    return new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  }

  function currentMonth() {
    return todayISO().slice(0, 7);
  }

  // Limites do mês no fuso America/Bahia (UTC-3), iguais aos usados pelo resumo da API.
  function monthRange(month) {
    const [year, mon] = month.split('-').map(Number);
    return {
      from: new Date(Date.UTC(year, mon - 1, 1, 3)).toISOString(),
      to: new Date(Date.UTC(year, mon, 1, 3) - 1).toISOString(),
    };
  }

  // Meio-dia no fuso local, para a data nunca cair no dia vizinho.
  function toApiDate(day) {
    return day + 'T12:00:00-03:00';
  }

  const money = {
    parseMoney,
    formatMoney,
    formatDate,
    todayISO,
    currentMonth,
    monthRange,
    toApiDate,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = money;
  } else {
    (window.CF = window.CF || {}).money = money;
  }
})();
