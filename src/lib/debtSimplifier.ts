// PayPaySplit Core Business Logic: Debt Calculation and Simplification

export interface MemberBalance {
  userId: string;
  userName: string;
  email: string;
  netBalance: number; // Positive means they should receive money, negative means they owe money
  totalPaid: number;  // Total amount they have paid out of pocket
  totalOwed: number;  // Total amount they are responsible for (their share of expenses)
}

export interface SimplifiedTransaction {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

interface ExpenseData {
  paidById: string;
  totalAmount: number | { toNumber(): number } | string;
  participants: {
    userId: string;
    shareAmount: number | { toNumber(): number } | string;
  }[];
}

interface SettlementData {
  paidById: string;
  paidToId: string;
  amount: number | { toNumber(): number } | string;
}

interface MemberData {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * Calculates net balances, total paid, and total owed for all members in a group
 */
export function calculateBalances(
  members: MemberData[],
  expenses: ExpenseData[],
  settlements: SettlementData[]
): MemberBalance[] {
  const balanceMap: Record<string, { totalPaid: number; totalOwed: number; name: string; email: string }> = {};

  // Initialize all members with 0 balances
  for (const m of members) {
    balanceMap[m.user.id] = {
      totalPaid: 0,
      totalOwed: 0,
      name: m.user.name,
      email: m.user.email,
    };
  }

  // Helper to convert Prisma Decimal / string / number to raw float
  const toNum = (val: any): number => {
    if (typeof val === "object" && val !== null && "toNumber" in val) {
      return val.toNumber();
    }
    if (typeof val === "string") {
      return parseFloat(val);
    }
    return val || 0;
  };

  // Add payments and obligations from expenses
  for (const expense of expenses) {
    const payerId = expense.paidById;
    const expenseAmt = toNum(expense.totalAmount);

    if (balanceMap[payerId]) {
      balanceMap[payerId].totalPaid += expenseAmt;
    }

    for (const participant of expense.participants) {
      const pId = participant.userId;
      const shareAmt = toNum(participant.shareAmount);

      if (balanceMap[pId]) {
        balanceMap[pId].totalOwed += shareAmt;
      }
    }
  }

  // Adjust for logged settlements
  // If User A pays User B ₹100, then User A's outstanding debt decreases by ₹100 (which increases their net balance by ₹100)
  // and User B's credit decreases by ₹100 (which decreases their net balance by ₹100).
  for (const s of settlements) {
    const payerId = s.paidById;
    const receiverId = s.paidToId;
    const settleAmt = toNum(s.amount);

    if (balanceMap[payerId]) {
      // Payer has paid more out of pocket
      balanceMap[payerId].totalPaid += settleAmt;
    }
    if (balanceMap[receiverId]) {
      // Receiver has effectively been "reimbursed", which acts as if they spent less out of pocket or owed more
      balanceMap[receiverId].totalOwed += settleAmt;
    }
  }

  // Map to final MemberBalance list
  return Object.entries(balanceMap).map(([userId, data]) => {
    const netBalance = Number((data.totalPaid - data.totalOwed).toFixed(2));
    return {
      userId,
      userName: data.name,
      email: data.email,
      netBalance,
      totalPaid: Number(data.totalPaid.toFixed(2)),
      totalOwed: Number(data.totalOwed.toFixed(2)),
    };
  });
}

/**
 * Greedily simplifies outstanding debts in a group to generate the minimum number of payments
 */
export function simplifyDebts(balances: MemberBalance[]): SimplifiedTransaction[] {
  // Separate into debtors (netBalance < 0) and creditors (netBalance > 0)
  const debtors = balances
    .filter((b) => b.netBalance < -0.005) // allow tiny float tolerance
    .map((b) => ({
      userId: b.userId,
      userName: b.userName,
      amount: Math.abs(b.netBalance),
    }))
    .sort((a, b) => b.amount - a.amount); // highest debt first

  const creditors = balances
    .filter((b) => b.netBalance > 0.005)
    .map((b) => ({
      userId: b.userId,
      userName: b.userName,
      amount: b.netBalance,
    }))
    .sort((a, b) => b.amount - a.amount); // highest credit first

  const transactions: SimplifiedTransaction[] = [];

  let debtorIdx = 0;
  let creditorIdx = 0;

  while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
    const debtor = debtors[debtorIdx];
    const creditor = creditors[creditorIdx];

    const minAmount = Math.min(debtor.amount, creditor.amount);
    
    if (minAmount > 0.005) {
      transactions.push({
        fromId: debtor.userId,
        fromName: debtor.userName,
        toId: creditor.userId,
        toName: creditor.userName,
        amount: Number(minAmount.toFixed(2)),
      });
    }

    debtor.amount -= minAmount;
    creditor.amount -= minAmount;

    if (debtor.amount < 0.005) {
      debtorIdx++;
    }
    if (creditor.amount < 0.005) {
      creditorIdx++;
    }
  }

  return transactions;
}
