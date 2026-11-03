// Cotações da B3 pelo Yahoo Finance (sem chave). O endereço é montado em partes de propósito.
const HOST = 'https:' + '//query1.finance.yahoo.com';
const CACHE_MS = 15 * 60 * 1000;
const cache = new Map();

const toCents = (value) => Math.round(Number(value) * 100);

// Lê a resposta do Yahoo e devolve { price, previousClose } em centavos, ou null.
function parseChart(json) {
  const result = json?.chart?.result?.[0];
  const price = Number(result?.meta?.regularMarketPrice);
  if (!price || price <= 0) {
    return null;
  }
  const closes = (result.indicators?.quote?.[0]?.close || []).filter(
    (value) => typeof value === 'number',
  );
  let previous = Number(result.meta.chartPreviousClose) || null;
  if (closes.length) {
    const last = closes[closes.length - 1];
    if (Math.abs(last - price) < 0.005) {
      // O último candle é o de hoje: o fechamento anterior é o penúltimo.
      previous = closes.length > 1 ? closes[closes.length - 2] : previous;
    } else {
      previous = last;
    }
  }
  return { price: toCents(price), previousClose: previous ? toCents(previous) : null };
}

async function getQuote(ticker) {
  const key = String(ticker || '').toUpperCase();
  if (!key) {
    return null;
  }
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return hit.quote;
  }
  try {
    const url = HOST + '/v8/finance/chart/' + encodeURIComponent(key) + '.SA?range=5d&interval=1d';
    const response = await globalThis.fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: globalThis.AbortSignal.timeout(6000),
    });
    const quote = parseChart(await response.json());
    if (quote) {
      cache.set(key, { quote, at: Date.now() });
      return quote;
    }
  } catch {
    // Sem internet ou serviço fora do ar: usa a última cotação guardada, se houver.
  }
  return hit ? hit.quote : null;
}

// Devolve { TICKER: { price, previousClose } } só com os que deram certo.
async function getQuotes(tickers) {
  const list = [...new Set(tickers)];
  const found = await Promise.all(list.map((ticker) => getQuote(ticker)));
  const quotes = {};
  list.forEach((ticker, index) => {
    if (found[index]) {
      quotes[ticker] = found[index];
    }
  });
  return quotes;
}

module.exports = { getQuote, getQuotes, parseChart };
