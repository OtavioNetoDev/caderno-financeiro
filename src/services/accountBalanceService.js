// Saldo por conta. Tudo em centavos inteiros.
// Entrada: contas e totais agrupados por (conta, destino, tipo, status).

function emptyBalance(account) {
  return {
    accountId: String(account._id),
    name: account.name,
    type: account.type,
    initialBalance: account.initialBalance || 0,
    balance: account.initialBalance || 0, // só lançamentos confirmados
    pending: 0, // efeito dos pendentes, ainda fora do saldo
  };
}

// Efeito de um grupo de lançamentos sobre a conta de origem e a de destino.
function effects(group) {
  const total = group.total;
  if (group.type === 'income') {
    return { origin: total, destination: 0 };
  }
  if (group.type === 'transfer') {
    return { origin: -total, destination: total };
  }
  // despesa e investimento (aporte) saem da conta
  return { origin: -total, destination: 0 };
}

function computeBalances(accounts, groups = []) {
  const byId = new Map(accounts.map((account) => [String(account._id), emptyBalance(account)]));

  for (const group of groups) {
    const { origin, destination } = effects(group);
    const field = group.status === 'pending' ? 'pending' : 'balance';

    const from = byId.get(String(group.accountId));
    if (from) {
      from[field] += origin;
    }
    const to = group.toAccountId ? byId.get(String(group.toAccountId)) : null;
    if (to) {
      to[field] += destination;
    }
  }

  const items = [...byId.values()];
  const netWorth = items.reduce((sum, item) => sum + item.balance, 0);
  const pending = items.reduce((sum, item) => sum + item.pending, 0);
  return { items, netWorth, pending, projected: netWorth + pending };
}

module.exports = { computeBalances };
