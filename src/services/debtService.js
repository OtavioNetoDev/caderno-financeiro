// Saldo = valor original + aumentos - pagamentos.
function computeBalance(originalAmount, entries = []) {
  return entries.reduce(
    (sum, entry) => sum + (entry.kind === 'increase' ? entry.amount : -entry.amount),
    originalAmount,
  );
}

// Registra uma movimentação na dívida. Devolve uma mensagem de erro ou null.
function applyEntry(debt, entry) {
  if (!Number.isInteger(entry.amount) || entry.amount <= 0) {
    return 'O valor deve ser um inteiro em centavos maior que zero';
  }
  if (entry.kind === 'payment' && entry.amount > debt.balance) {
    return 'O pagamento é maior que o saldo da dívida';
  }
  debt.entries.push(entry);
  debt.balance = computeBalance(debt.originalAmount, debt.entries);
  debt.status = debt.balance === 0 ? 'settled' : 'open';
  return null;
}

function summarize(debts) {
  let receivable = 0;
  let payable = 0;
  let openCount = 0;
  for (const debt of debts) {
    if (debt.status !== 'open') {
      continue;
    }
    openCount += 1;
    if (debt.direction === 'receivable') {
      receivable += debt.balance;
    } else {
      payable += debt.balance;
    }
  }
  return { receivable, payable, net: receivable - payable, openCount };
}

module.exports = { computeBalance, applyEntry, summarize };
