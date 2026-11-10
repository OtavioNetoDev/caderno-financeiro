const withDeadline = require('../utils/deadline');

// Cotações da B3 pelo Yahoo Finance (sem chave). O endereço é montado em partes de propósito.
const HOST = 'https:' + '//query1.finance.yahoo.com';
const CACHE_MS = 15 * 60 * 1000;
const cache = new Map();
// Depois de uma falha, não tenta de novo por um tempo: a tela não espera a internet a cada abertura.
const RETRY_MS = 2 * 60 * 1000;
const failures = new Map();
const inflight = new Map();

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

async function fetchQuote(key) {
  try {
    const url = HOST + '/v8/finance/chart/' + encodeURIComponent(key) + '.SA?range=5d&interval=1d';
    const response = await globalThis.fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: globalThis.AbortSignal.timeout(4000),
    });
    const quote = parseChart(await response.json());
    if (quote) {
      cache.set(key, { quote, at: Date.now() });
      failures.delete(key);
      return quote;
    }
  } catch {
    // Sem internet ou serviço fora do ar: vale a última cotação guardada, se houver.
  }
  failures.set(key, Date.now());
  return null;
}

// Uma busca por código de cada vez, mesmo que várias telas peçam juntas.
function refreshQuote(key) {
  if (!inflight.has(key)) {
    inflight.set(
      key,
      fetchQuote(key).finally(() => inflight.delete(key)),
    );
  }
  return inflight.get(key);
}

// Cotação sem travar a tela:
// - recente: devolve na hora;
// - velha: devolve a velha na hora e atualiza em segundo plano;
// - nunca buscada: espera por até waitMs (se informado) e segue sem ela se demorar;
// - depois de uma falha, só tenta de novo após alguns minutos.
async function getQuote(ticker, { waitMs } = {}) {
  const key = String(ticker || '').toUpperCase();
  if (!key) {
    return null;
  }
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return hit.quote;
  }
  if (Date.now() - (failures.get(key) || 0) < RETRY_MS) {
    return hit ? hit.quote : null;
  }
  const pending = refreshQuote(key);
  if (hit) {
    return hit.quote;
  }
  return withDeadline(pending, waitMs);
}

// Devolve { TICKER: { price, previousClose } } só com os que deram certo.
async function getQuotes(tickers, options) {
  const list = [...new Set(tickers)];
  const found = await Promise.all(list.map((ticker) => getQuote(ticker, options)));
  const quotes = {};
  list.forEach((ticker, index) => {
    if (found[index]) {
      quotes[ticker] = found[index];
    }
  });
  return quotes;
}

// Só para os testes.
function resetCache() {
  cache.clear();
  failures.clear();
  inflight.clear();
}

module.exports = { getQuote, getQuotes, parseChart, resetCache };
