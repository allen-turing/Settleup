import assert from "assert";

async function runVerification() {
  console.log("🚀 Starting E2E API Verification...");

  const BASE_URL = "http://localhost:3000";
  let sessionCookie = "";

  // Helper fetch function that forwards the session cookie
  async function apiFetch(urlPath: string, options: RequestInit = {}) {
    const headers = new Headers(options.headers || {});
    if (sessionCookie) {
      headers.set("Cookie", sessionCookie);
    }
    const response = await fetch(`${BASE_URL}${urlPath}`, {
      ...options,
      headers,
    });
    return response;
  }

  // 1. SIGNUP ALICE
  console.log("👉 Registering new user 'Alice'...");
  const signupPayload = {
    name: "Alice Test",
    email: `alice.${Date.now()}@example.com`, // Unique email each run
    password: "password123",
  };

  const signupRes = await apiFetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(signupPayload),
  });

  assert.strictEqual(signupRes.status, 201, `Signup failed with status ${signupRes.status}`);
  const signupData = await signupRes.json();
  const aliceId = signupData.user.id;
  console.log(`✅ Alice registered. ID: ${aliceId}`);

  // Retrieve cookie header using standard getSetCookie()
  const setCookies = signupRes.headers.getSetCookie();
  const tokenCookie = setCookies.find((c) => c.startsWith("token="));
  
  if (tokenCookie) {
    sessionCookie = tokenCookie.split(";")[0];
    console.log("🔑 Session cookie captured successfully:", sessionCookie.substring(0, 30) + "...");
  } else {
    console.log("Headers available:", Array.from(signupRes.headers.entries()));
    throw new Error("Failed to retrieve Set-Cookie token from signup response.");
  }

  // 2. CREATE A TRIP GROUP
  console.log("👉 Creating trip group 'EuroTrip 2026'...");
  const groupPayload = {
    name: "EuroTrip 2026",
    description: "Touring Europe with friends",
  };

  const groupRes = await apiFetch("/api/groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(groupPayload),
  });

  assert.strictEqual(groupRes.status, 201, "Group creation failed.");
  const groupData = await groupRes.json();
  const groupId = groupData.group.id;
  console.log(`✅ Group created successfully. ID: ${groupId}`);

  // 3. FETCH SEEDED CATEGORIES TO OBTAIN VALID ID
  console.log("👉 Fetching seeded categories...");
  const categoriesRes = await apiFetch("/api/categories");
  assert.strictEqual(categoriesRes.status, 200, "Categories fetch failed.");
  const categoriesData = await categoriesRes.json();
  assert(categoriesData.categories.length > 0, "No seeded categories found.");
  const categoryId = categoriesData.categories[0].id;
  console.log(`✅ Loaded Category: ${categoriesData.categories[0].name} (ID: ${categoryId})`);

  // 4. INVITE BOB AND CHARLIE
  console.log("👉 Inviting Bob (bob@example.com)...");
  const inviteBobRes = await apiFetch(`/api/groups/${groupId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "bob@example.com" }),
  });
  assert.strictEqual(inviteBobRes.status, 201, "Failed to invite Bob.");
  const bobData = await inviteBobRes.json();
  const bobId = bobData.user.id;
  console.log(`✅ Invited Bob. ID: ${bobId}`);

  console.log("👉 Inviting Charlie (charlie@example.com)...");
  const inviteCharlieRes = await apiFetch(`/api/groups/${groupId}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "charlie@example.com" }),
  });
  assert.strictEqual(inviteCharlieRes.status, 201, "Failed to invite Charlie.");
  const charlieData = await inviteCharlieRes.json();
  const charlieId = charlieData.user.id;
  console.log(`✅ Invited Charlie. ID: ${charlieId}`);

  // 5. LOG EXPENSE 1: HOTEL BOOKING (300 INR, paid by Alice, split Equal among Alice, Bob, Charlie)
  console.log("👉 Logging Expense 1: Hotel Booking (300 INR split equally among 3)...");
  const expense1Payload = {
    groupId,
    title: "Hotel Booking",
    totalAmount: 300,
    paidById: aliceId,
    categoryId,
    splitType: "EQUAL",
    expenseDate: new Date().toISOString(),
    participants: [{ userId: aliceId }, { userId: bobId }, { userId: charlieId }],
  };

  const exp1Res = await apiFetch("/api/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(expense1Payload),
  });
  assert.strictEqual(exp1Res.status, 201, `Failed to log Expense 1: ${exp1Res.status}`);
  console.log("✅ Expense 1 logged successfully.");

  // 6. LOG EXPENSE 2: CAR RENTAL (150 INR, paid by Alice, split Equal between Alice and Bob)
  console.log("👉 Logging Expense 2: Car Rental (150 INR split equally among 2)...");
  const expense2Payload = {
    groupId,
    title: "Car Rental",
    totalAmount: 150,
    paidById: aliceId,
    categoryId,
    splitType: "EQUAL",
    expenseDate: new Date().toISOString(),
    participants: [{ userId: aliceId }, { userId: bobId }],
  };

  const exp2Res = await apiFetch("/api/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(expense2Payload),
  });
  assert.strictEqual(exp2Res.status, 201, "Failed to log Expense 2.");
  console.log("✅ Expense 2 logged successfully.");

  // 7. GET GROUP DETAILS AND CHECK NET BALANCES & SIMPLIFIED TRANSACTIONS
  console.log("👉 Fetching group details and balances sheet...");
  const detailsRes = await apiFetch(`/api/groups/${groupId}`);
  assert.strictEqual(detailsRes.status, 200, "Group details fetch failed.");
  const details = await detailsRes.json();

  console.log("🔍 Dynamic Net Balances Result:");
  details.balances.forEach((b: any) => {
    console.log(`   👤 ${b.userName}: Paid = ₹${b.totalPaid}, Owed = ₹${b.totalOwed}, Net = ${b.netBalance > 0 ? "+" : ""}₹${b.netBalance}`);
  });

  // Assert expected balances
  const aliceBal = details.balances.find((b: any) => b.userId === aliceId);
  const bobBal = details.balances.find((b: any) => b.userId === bobId);
  const charlieBal = details.balances.find((b: any) => b.userId === charlieId);

  assert.strictEqual(aliceBal.netBalance, 275, `Alice balance should be +275, got ${aliceBal.netBalance}`);
  assert.strictEqual(bobBal.netBalance, -175, `Bob balance should be -175, got ${bobBal.netBalance}`);
  assert.strictEqual(charlieBal.netBalance, -100, `Charlie balance should be -100, got ${charlieBal.netBalance}`);
  console.log("✅ Balance checks passed successfully!");

  console.log("🔍 Simplified Debt Settlement Suggestions:");
  details.simplifiedTransactions.forEach((tx: any) => {
    console.log(`   💸 ${tx.fromName} pays ₹${tx.amount.toFixed(2)} to ${tx.toName}`);
  });
  assert.strictEqual(details.simplifiedTransactions.length, 2, "Should have 2 simplified transactions.");
  console.log("✅ Simplified debt transactions checks passed successfully!");

  // 8. LOG CHARLIE SETTLEMENT PAYMENT (100 INR to Alice)
  console.log("👉 Logging Charlie's Settlement Payment (100 INR to Alice)...");
  const settlePayload = {
    groupId,
    paidById: charlieId,
    paidToId: aliceId,
    amount: 100,
    settlementDate: new Date().toISOString(),
    note: "Settle hotel bill via cash",
  };

  const settleRes = await apiFetch("/api/settlements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settlePayload),
  });
  assert.strictEqual(settleRes.status, 201, "Failed to log settlement.");
  console.log("✅ Settlement logged successfully.");

  // 9. RE-VERIFY UPDATE LEDGER BALANCES AND SIMPLIFIED TRANSACTIONS
  console.log("👉 Re-fetching updated balances...");
  const finalDetailsRes = await apiFetch(`/api/groups/${groupId}`);
  const finalDetails = await finalDetailsRes.json();

  console.log("🔍 Updated Dynamic Net Balances:");
  finalDetails.balances.forEach((b: any) => {
    console.log(`   👤 ${b.userName}: Paid = ₹${b.totalPaid}, Owed = ₹${b.totalOwed}, Net = ${b.netBalance > 0 ? "+" : ""}₹${b.netBalance}`);
  });

  const aliceFinal = finalDetails.balances.find((b: any) => b.userId === aliceId);
  const bobFinal = finalDetails.balances.find((b: any) => b.userId === bobId);
  const charlieFinal = finalDetails.balances.find((b: any) => b.userId === charlieId);

  assert.strictEqual(aliceFinal.netBalance, 175, `Alice updated balance should be +175, got ${aliceFinal.netBalance}`);
  assert.strictEqual(bobFinal.netBalance, -175, `Bob updated balance should be -175, got ${bobFinal.netBalance}`);
  assert.strictEqual(charlieFinal.netBalance, 0, `Charlie updated balance should be settled (0), got ${charlieFinal.netBalance}`);
  console.log("✅ Updated balance ledger checks passed successfully!");

  console.log("🔍 Updated Simplified Transactions:");
  finalDetails.simplifiedTransactions.forEach((tx: any) => {
    console.log(`   💸 ${tx.fromName} pays ₹${tx.amount.toFixed(2)} to ${tx.toName}`);
  });
  assert.strictEqual(finalDetails.simplifiedTransactions.length, 1, "Should have exactly 1 simplified transaction.");
  assert.strictEqual(finalDetails.simplifiedTransactions[0].fromId, bobId, "Payer should be Bob.");
  assert.strictEqual(finalDetails.simplifiedTransactions[0].toId, aliceId, "Receiver should be Alice.");
  assert.strictEqual(finalDetails.simplifiedTransactions[0].amount, 175, "Amount should be 175.");
  console.log("✅ Final simplified transaction verified.");

  console.log("\n⭐️⭐️⭐️ E2E FULL-STACK API VERIFICATION COMPLETED SUCCESSFULLY! ⭐️⭐️⭐️\n");
}

runVerification().catch((err) => {
  console.error("❌ E2E Verification failed:", err);
  process.exit(1);
});
