const { isValidDay, dayOf } = require('../utils/day');

const TYPES = ['income', 'expense', 'investment'];

const normalize = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

// Mesmo dia (fuso do Brasil), valor, tipo e descrição = mesmo lançamento.
function duplicateKey(item) {
  const description = item.description !== undefined ? item.description : item.text;
  return [dayOf(item.date), item.amount, item.type, normalize(description)].join('|');
}

// Marca como duplicadas as linhas que já existem. Considera a quantidade: duas compras iguais
// legítimas no mesmo dia só viram duplicadas se o sistema já tiver as duas.
function markDuplicates(rows, existing) {
  const counts = new Map();
  for (const item of existing) {
    const key = duplicateKey(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return rows.map((row) => {
    if (!Number.isInteger(row.amount)) {
      return { ...row, duplicate: false };
    }
    const key = duplicateKey(row);
    const left = counts.get(key) || 0;
    if (left > 0) {
      counts.set(key, left - 1);
      return { ...row, duplicate: true };
    }
    return { ...row, duplicate: false };
  });
}

// Devolve uma mensagem de erro ou null.
function validateRow(row) {
  if (!row || typeof row !== 'object') {
    return 'Linha inválida';
  }
  if (!isValidDay(row.date)) {
    return 'Data inválida';
  }
  if (!Number.isInteger(row.amount) || row.amount < 1) {
    return 'Valor inválido';
  }
  if (!TYPES.includes(row.type)) {
    return 'Tipo inválido';
  }
  if (
    typeof row.description !== 'string' ||
    !row.description.trim() ||
    row.description.length > 200
  ) {
    return 'Descrição inválida';
  }
  if (row.shareMode && !['with', 'for'].includes(row.shareMode)) {
    return 'Campo com/de inválido';
  }
  if (row.status && !['confirmed', 'pending'].includes(row.status)) {
    return 'Status inválido';
  }
  if (row.personName && (typeof row.personName !== 'string' || row.personName.length > 60)) {
    return 'Pessoa inválida';
  }
  return null;
}

module.exports = { duplicateKey, markDuplicates, validateRow };
