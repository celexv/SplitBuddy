/**
 * Calculate net balance for each member across all expenses in a group.
 * Positive = they are owed money (lent)
 * Negative = they owe money (borrowed)
 */
export function calculateBalances(members, expenses) {
  const balanceMap = {};

  // Initialize all members with 0 balance
  members.forEach((m) => {
    balanceMap[m.id] = {
      id: m.id,
      name: m.name,
      totalPaid: 0,
      totalOwed: 0,
      net: 0,
    };
  });

  expenses.forEach((expense) => {
    // Add paid amounts
    (expense.payers || []).forEach((payer) => {
      if (balanceMap[payer.memberId]) {
        balanceMap[payer.memberId].totalPaid += payer.amount;
      }
    });

    // Add split amounts (what each person owes)
    (expense.splits || []).forEach((split) => {
      if (balanceMap[split.memberId]) {
        balanceMap[split.memberId].totalOwed += split.amount;
      }
    });
  });

  // Calculate net: paid - owed
  // Positive means they're owed money; negative means they owe money
  Object.values(balanceMap).forEach((b) => {
    b.net = b.totalPaid - b.totalOwed;
  });

  return Object.values(balanceMap);
}

/**
 * Generate minimal settlement suggestions using a greedy algorithm.
 * Returns array of { from, to, amount } — "from owes 'to' this amount"
 */
export function getSettlements(balances) {
  const settlements = [];

  // Create mutable copies sorted: creditors (positive net) and debtors (negative net)
  let creditors = balances
    .filter((b) => b.net > 0.01)
    .map((b) => ({ ...b }))
    .sort((a, b) => b.net - a.net);

  let debtors = balances
    .filter((b) => b.net < -0.01)
    .map((b) => ({ ...b }))
    .sort((a, b) => a.net - b.net);

  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci];
    const debt = debtors[di];
    const amount = Math.min(credit.net, -debt.net);

    if (amount > 0.01) {
      settlements.push({
        from: debt.name,
        fromId: debt.id,
        to: credit.name,
        toId: credit.id,
        amount: Math.round(amount * 100) / 100,
      });
    }

    credit.net -= amount;
    debt.net += amount;

    if (Math.abs(credit.net) < 0.01) ci++;
    if (Math.abs(debt.net) < 0.01) di++;
  }

  return settlements;
}

export function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}
