// Taxas públicas do Banco Central (SGS 4389 = CDI anualizado, % a.a.). Sem chave e sem custo.
const CDI_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json';
const CACHE_MS = 6 * 60 * 60 * 1000;

let cache = { annual: null, date: null, at: 0 };

// Devolve { annual, date }. Se a busca falhar, usa o último valor guardado ou annual = null.
async function getCdi() {
  if (cache.annual !== null && Date.now() - cache.at < CACHE_MS) {
    return { annual: cache.annual, date: cache.date };
  }
  try {
    const response = await globalThis.fetch(CDI_URL, {
      signal: globalThis.AbortSignal.timeout(5000),
    });
    const data = await response.json();
    const annual = Number(String(data[0].valor).replace(',', '.'));
    if (Number.isFinite(annual) && annual > 0) {
      cache = { annual, date: data[0].data, at: Date.now() };
    }
  } catch {
    // Sem internet ou API fora do ar: segue com o que já tinha.
  }
  return { annual: cache.annual, date: cache.date };
}

module.exports = { getCdi };
