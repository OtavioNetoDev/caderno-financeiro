const withDeadline = require('../utils/deadline');

// Taxas públicas do Banco Central (SGS 4389 = CDI anualizado, % a.a.). Sem chave e sem custo.
const CDI_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json'\;
const CACHE_MS = 6 * 60 * 60 * 1000;
// Depois de uma falha, não tenta de novo por um tempo: assim a tela não espera a internet a cada abertura.
const RETRY_MS = 2 * 60 * 1000;

let cache = { annual: null, date: null, at: 0, failedAt: 0 };
let inflight = null;

const current = () => ({ annual: cache.annual, date: cache.date });

async function load() {
  try {
    const response = await globalThis.fetch(CDI_URL, {
      signal: globalThis.AbortSignal.timeout(4000),
    });
    const data = await response.json();
    const annual = Number(String(data[0].valor).replace(',', '.'));
    if (Number.isFinite(annual) && annual > 0) {
      cache = { annual, date: data[0].data, at: Date.now(), failedAt: 0 };
      return;
    }
  } catch {
    // Sem internet ou API fora do ar: segue com o que já tinha.
  }
  cache.failedAt = Date.now();
}

// Devolve { annual, date } sem travar a tela:
// - valor recente: devolve na hora;
// - valor velho: devolve o velho na hora e atualiza em segundo plano;
// - sem nenhum valor: espera a busca por até waitMs (se informado);
// - depois de uma falha, só tenta de novo após alguns minutos.
async function getCdi({ waitMs } = {}) {
  const fresh = cache.annual !== null && Date.now() - cache.at < CACHE_MS;
  if (fresh || Date.now() - cache.failedAt < RETRY_MS) {
    return current();
  }
  if (!inflight) {
    inflight = load().finally(() => {
      inflight = null;
    });
  }
  if (cache.annual === null) {
    await withDeadline(inflight, waitMs);
  }
  return current();
}

// Só para os testes.
function resetCache() {
  cache = { annual: null, date: null, at: 0, failedAt: 0 };
  inflight = null;
}

module.exports = { getCdi, resetCache };
