// Regras da restauração de backup (sem acesso ao banco).
const BACKUP_VERSION = 1;
const COLLECTIONS = [
  'accounts',
  'categories',
  'cards',
  'recurring',
  'transactions',
  'cardCharges',
  'budgets',
  'debts',
  'investments',
  'notes',
];
const OBJECT_ID = /^[0-9a-f]{24}$/i;

// Para cada campo que aponta para outra coleção: [coleção, campo, coleção apontada].
const REFERENCES = [
  ['transactions', 'accountId', 'accounts'],
  ['transactions', 'toAccountId', 'accounts'],
  ['transactions', 'categoryId', 'categories'],
  ['cardCharges', 'cardId', 'cards'],
  ['cardCharges', 'categoryId', 'categories'],
  ['budgets', 'categoryId', 'categories'],
  ['recurring', 'accountId', 'accounts'],
  ['recurring', 'categoryId', 'categories'],
];

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

// Lê o texto do arquivo e confere a estrutura. Lança RangeError com a mensagem para o usuário.
function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new RangeError('O arquivo não é um JSON válido');
  }
  if (!isObject(data) || data.version !== BACKUP_VERSION) {
    throw new RangeError('Este arquivo não é um backup do Caderno Financeiro (versão 1)');
  }
  const collections = {};
  for (const name of COLLECTIONS) {
    const list = data[name] === undefined ? [] : data[name];
    if (!Array.isArray(list)) {
      throw new RangeError(`O campo "${name}" do backup deve ser uma lista`);
    }
    if (!list.every((doc) => isObject(doc) && OBJECT_ID.test(String(doc._id)))) {
      throw new RangeError(`O campo "${name}" tem itens sem identificador válido`);
    }
    collections[name] = list;
  }
  const owner = isObject(data.user) && typeof data.user.email === 'string' ? data.user.email : '';
  return { collections, owner };
}

// Separa os itens do backup em: novos, recuperados (estavam na lixeira), já existentes e em conflito.
// `existing` mapeia o _id para { userId, deletedAt } do que já está no banco.
// `isDuplicate` permite pular itens repetidos por outra regra (ex.: uma meta por categoria).
function classify(docs, existing, userId, isDuplicate = () => false) {
  const result = { insert: [], restore: [], skip: [], conflicts: [] };
  const seen = new Set();
  for (const doc of docs) {
    const id = String(doc._id);
    const found = existing.get(id);
    if (seen.has(id)) {
      result.skip.push(doc);
    } else if (!found) {
      result[isDuplicate(doc) ? 'skip' : 'insert'].push(doc);
    } else if (String(found.userId) !== String(userId)) {
      result.conflicts.push(doc);
    } else if (found.deletedAt && !doc.deletedAt) {
      result.restore.push(doc);
    } else {
      result.skip.push(doc);
    }
    seen.add(id);
  }
  return result;
}

// Conta os itens que apontam para algo que não existe no banco nem no backup.
// `incoming` traz só o que será gravado; `known` os ids (texto) existentes por coleção.
function brokenReferences(incoming, known) {
  const problems = [];
  for (const [collection, field, target] of REFERENCES) {
    const count = (incoming[collection] || []).filter(
      (doc) => doc[field] && !known[target].has(String(doc[field])),
    ).length;
    if (count > 0) {
      problems.push({ collection, field, count });
    }
  }
  return problems;
}

module.exports = { BACKUP_VERSION, COLLECTIONS, parseBackup, classify, brokenReferences };
