// PayPaySplit Unit Tests for Balance Calculations and Debt Simplification
import assert from "node:assert";
import { calculateBalances, simplifyDebts } from "./debtSimplifier";

function runTests() {
  console.log("=== Running PayPaySplit Debt Simplifier Tests ===");

  const members = [
    { user: { id: "1", name: "Alice", email: "alice@example.com" } },
    { user: { id: "2", name: "Bob", email: "bob@example.com" } },
    { user: { id: "3", name: "Charlie", email: "charlie@example.com" } },
  ];

  // TEST 1: Equal Split Expense
  // Alice paid 300, split equally between Alice, Bob, Charlie (100 each)
  console.log("Running Test 1: Equal Split Expense...");
  const expenses1 = [
    {
      paidById: "1",
      totalAmount: 300,
      participants: [
        { userId: "1", shareAmount: 100 },
        { userId: "2", shareAmount: 100 },
        { userId: "3", shareAmount: 100 },
      ],
    },
  ];
  const settlements1: any[] = [];
  
  const balances1 = calculateBalances(members, expenses1, settlements1);
  
  const aliceBal = balances1.find(b => b.userId === "1")!;
  const bobBal = balances1.find(b => b.userId === "2")!;
  const charlieBal = balances1.find(b => b.userId === "3")!;

  assert.strictEqual(aliceBal.netBalance, 200, "Alice should be owed 200");
  assert.strictEqual(bobBal.netBalance, -100, "Bob should owe 100");
  assert.strictEqual(charlieBal.netBalance, -100, "Charlie should owe 100");
  console.log("✓ Test 1 Passed!");

  // TEST 2: Debt Simplification
  // From Test 1 balances, Bob and Charlie owe Alice 100 each.
  console.log("Running Test 2: Debt Simplification...");
  const txs1 = simplifyDebts(balances1);
  
  assert.strictEqual(txs1.length, 2, "Should require exactly 2 transactions");
  assert.ok(txs1.some(t => t.fromId === "2" && t.toId === "1" && t.amount === 100), "Bob pays Alice 100");
  assert.ok(txs1.some(t => t.fromId === "3" && t.toId === "1" && t.amount === 100), "Charlie pays Alice 100");
  console.log("✓ Test 2 Passed!");

  // TEST 3: Complex Circular Debts
  // Alice owes Bob 100.
  // Bob owes Charlie 100.
  // Charlie owes Alice 100.
  // Net balances: Alice = 0, Bob = 0, Charlie = 0.
  // Simplification should produce ZERO transactions.
  console.log("Running Test 3: Circular Debt Simplification...");
  const circularBalances = [
    { userId: "1", userName: "Alice", email: "a@e.com", netBalance: 0, totalPaid: 100, totalOwed: 100 },
    { userId: "2", userName: "Bob", email: "b@e.com", netBalance: 0, totalPaid: 100, totalOwed: 100 },
    { userId: "3", userName: "Charlie", email: "c@e.com", netBalance: 0, totalPaid: 100, totalOwed: 100 },
  ];
  const txsCircular = simplifyDebts(circularBalances);
  assert.strictEqual(txsCircular.length, 0, "Circular debt with 0 net balances should simplify to 0 transactions");
  console.log("✓ Test 3 Passed!");

  // TEST 4: Settlement impact
  // Alice paid 300, split 100 each.
  // Bob settles 100 to Alice.
  // Remaining: Charlie owes Alice 100.
  console.log("Running Test 4: Settlement impact...");
  const settlements4 = [
    {
      paidById: "2", // Bob paid
      paidToId: "1", // to Alice
      amount: 100,
    }
  ];
  
  const balances4 = calculateBalances(members, expenses1, settlements4);
  const aliceBal4 = balances4.find(b => b.userId === "1")!;
  const bobBal4 = balances4.find(b => b.userId === "2")!;
  const charlieBal4 = balances4.find(b => b.userId === "3")!;

  assert.strictEqual(aliceBal4.netBalance, 100, "Alice should be owed 100 now");
  assert.strictEqual(bobBal4.netBalance, 0, "Bob should be fully settled (0)");
  assert.strictEqual(charlieBal4.netBalance, -100, "Charlie should still owe 100");
  
  const txs4 = simplifyDebts(balances4);
  assert.strictEqual(txs4.length, 1, "Should require only 1 transaction");
  assert.strictEqual(txs4[0].fromId, "3", "Payer should be Charlie");
  assert.strictEqual(txs4[0].toId, "1", "Receiver should be Alice");
  assert.strictEqual(txs4[0].amount, 100, "Amount should be 100");
  console.log("✓ Test 4 Passed!");

  // TEST 5: Self Only (Personal) Expense
  // Alice paid 150 for a personal item (splitType: SELF or empty participants)
  // Bob paid 200, which was an equal split of 100 each for Alice and Bob.
  // Alice's netBalance should be:
  //   Paid: 0 (equal split) + 150 (personal) = 150
  //   Owed: 100 (equal split share) + 150 (personal share) = 250
  //   Net: 150 - 250 = -100
  // Bob's netBalance should be:
  //   Paid: 200 (equal split) = 200
  //   Owed: 100 (equal split share) = 100
  //   Net: 200 - 100 = 100
  console.log("Running Test 5: Self Only (Personal) Expense...");
  const expenses5 = [
    {
      paidById: "1", // Alice paid
      totalAmount: 150,
      splitType: "SELF",
      participants: [], // empty participants
    },
    {
      paidById: "2", // Bob paid
      totalAmount: 200,
      splitType: "EQUAL",
      participants: [
        { userId: "1", shareAmount: 100 },
        { userId: "2", shareAmount: 100 },
      ],
    },
  ];
  const balances5 = calculateBalances(members, expenses5, []);
  const aliceBal5 = balances5.find(b => b.userId === "1")!;
  const bobBal5 = balances5.find(b => b.userId === "2")!;
  const charlieBal5 = balances5.find(b => b.userId === "3")!;

  assert.strictEqual(aliceBal5.netBalance, -100, "Alice should owe 100");
  assert.strictEqual(bobBal5.netBalance, 100, "Bob should be owed 100");
  assert.strictEqual(charlieBal5.netBalance, 0, "Charlie should be settled");
  console.log("✓ Test 5 Passed!");

  console.log("=== All PayPaySplit Debt Simplifier Tests Passed Successfully! ===");
}

try {
  runTests();
} catch (e) {
  console.error("Test execution failed:", e);
  process.exit(1);
}
