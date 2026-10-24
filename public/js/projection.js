(function () {
  const MAX_YEARS = 100;

  // Taxas equivalentes (juros compostos) a partir de uma taxa anual em %.
  function periodRates(annualPercent) {
    const annual = annualPercent / 100;
    return {
      daily: Math.pow(1 + annual, 1 / 365) - 1,
      weekly: Math.pow(1 + annual, 7 / 365) - 1,
      monthly: Math.pow(1 + annual, 1 / 12) - 1,
    };
  }

  // Rendimento estimado de um saldo (em centavos) por dia, semana e mês.
  function estimateYield(balanceCents, annualPercent) {
    const rates = periodRates(annualPercent);
    return {
      daily: Math.round(balanceCents * rates.daily),
      weekly: Math.round(balanceCents * rates.weekly),
      monthly: Math.round(balanceCents * rates.monthly),
    };
  }

  // Projeção ano a ano, de 1 a 100 anos. Aportes ao fim de cada mês, com juros compostos mensais.
  function project({ initialCents = 0, monthlyContributionCents = 0, annualPercent = 0, years }) {
    if (!Number.isInteger(years) || years < 1 || years > MAX_YEARS) {
      throw new RangeError('years deve ser um inteiro entre 1 e ' + MAX_YEARS);
    }
    const values = [initialCents, monthlyContributionCents, annualPercent];
    if (!values.every(Number.isFinite) || values.some((value) => value < 0)) {
      throw new RangeError('Os valores devem ser números maiores ou iguais a zero');
    }

    const monthlyRate = periodRates(annualPercent).monthly;
    let balance = initialCents;
    let invested = initialCents;
    const rows = [];
    for (let year = 1; year <= years; year += 1) {
      for (let month = 0; month < 12; month += 1) {
        balance = balance * (1 + monthlyRate) + monthlyContributionCents;
        invested += monthlyContributionCents;
      }
      rows.push({
        year,
        balanceCents: Math.round(balance),
        investedCents: invested,
        interestCents: Math.round(balance - invested),
      });
    }
    return rows;
  }

  const projection = { MAX_YEARS, periodRates, estimateYield, project };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = projection;
  } else {
    (window.CF = window.CF || {}).projection = projection;
  }
})();
