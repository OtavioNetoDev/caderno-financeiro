const MAX_CENTS = 100000000; // R$ 1.000.000,00

// Números em formato brasileiro. Ignora datas (01/05/2026), unidades (1 tb), porcentagens e códigos (mxrf11, 3A).
const NUMBER_RE =
  /(?<![\p{L}\d.,/])(R\$\s*)?(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?(?:(\s*(?:reais|real)\b)|(?!\s*(?:gb|tb|mb|kb|kg|g|ml|l|cm|mm|x)\b)(?!\s*%))(?![\p{L}\d/])/giu;

// Escolhe o valor do trecho: prefere o que tem "R$" ou "reais". Vários números = confiança baixa.
function extractAmount(text) {
  const candidates = [];
  for (const match of String(text).matchAll(NUMBER_RE)) {
    const whole = Number(match[2].replace(/\./g, ''));
    const decimals = match[3] ? Number(match[3].padEnd(2, '0')) : 0;
    const cents = whole * 100 + decimals;
    if (cents > 0 && cents <= MAX_CENTS) {
      candidates.push({ cents, currency: Boolean(match[1] || match[4]) });
    }
  }
  if (!candidates.length) {
    return { cents: null, confidence: 'low', count: 0 };
  }
  const chosen = candidates.find((item) => item.currency) || candidates[0];
  return {
    cents: chosen.cents,
    confidence: candidates.length === 1 ? 'high' : 'low',
    count: candidates.length,
  };
}

module.exports = { extractAmount };
