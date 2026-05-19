import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/audit/export
// Returns a complete JSON snapshot of all data belonging to the current user's groups.
// This snapshot is portable and can be fed back into /api/audit/import to recreate state.
export async function GET() {
  try {
    const payload = await getCurrentUser();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch the requesting user's own profile
    const me = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    if (!me) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // 2. Find all groups this user belongs to (as member OR creator)
    const memberGroupIds = await prisma.groupMember.findMany({
      where: { userId: payload.userId },
      select: { groupId: true },
    });
    const groupIds = memberGroupIds.map((m) => m.groupId);

    if (groupIds.length === 0) {
      return NextResponse.json(
        {
          _meta: {
            exportedAt: new Date().toISOString(),
            exportedBy: me.email,
            version: "1.0",
          },
          users: [me],
          categories: [],
          groups: [],
          groupMembers: [],
          expenses: [],
          expenseParticipants: [],
          settlements: [],
          invitations: [],
        },
        { status: 200 }
      );
    }

    // 3. Fetch all groups
    const groups = await prisma.group.findMany({
      where: { id: { in: groupIds } },
      select: {
        id: true,
        name: true,
        description: true,
        createdById: true,
        createdAt: true,
      },
    });

    // 4. Fetch all members across those groups
    const groupMembers = await prisma.groupMember.findMany({
      where: { groupId: { in: groupIds } },
      select: { groupId: true, userId: true, joinedAt: true },
    });

    // 5. Collect ALL unique user IDs across all memberships
    const allUserIds = [...new Set(groupMembers.map((m) => m.userId))];

    // 6. Fetch all those users (without passwordHash for security)
    const users = await prisma.user.findMany({
      where: { id: { in: allUserIds } },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    // 7. Fetch all expenses
    const expenses = await prisma.expense.findMany({
      where: { groupId: { in: groupIds } },
      select: {
        id: true,
        groupId: true,
        title: true,
        description: true,
        totalAmount: true,
        paidById: true,
        categoryId: true,
        splitType: true,
        expenseDate: true,
        currency: true,
        receiptUrl: true,
        createdAt: true,
      },
    });

    // 8. Fetch all expense participants
    const expenseIds = expenses.map((e) => e.id);
    const expenseParticipants =
      expenseIds.length > 0
        ? await prisma.expenseParticipant.findMany({
            where: { expenseId: { in: expenseIds } },
            select: {
              expenseId: true,
              userId: true,
              shareAmount: true,
              percentage: true,
              shares: true,
              isSettled: true,
            },
          })
        : [];

    // 9. Fetch all settlements
    const settlements = await prisma.settlement.findMany({
      where: { groupId: { in: groupIds } },
      select: {
        id: true,
        groupId: true,
        paidById: true,
        paidToId: true,
        amount: true,
        settlementDate: true,
        note: true,
        createdAt: true,
      },
    });

    // 10. Fetch all pending invitations
    const invitations = await prisma.groupInvitation.findMany({
      where: { groupId: { in: groupIds } },
      select: {
        id: true,
        groupId: true,
        email: true,
        invitedAt: true,
      },
    });

    // 11. Fetch referenced categories
    const categoryIds = [...new Set(expenses.map((e) => e.categoryId))];
    const categories =
      categoryIds.length > 0
        ? await prisma.category.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, name: true, icon: true, color: true },
          })
        : [];

    const snapshot = {
      _meta: {
        exportedAt: new Date().toISOString(),
        exportedBy: me.email,
        version: "1.0",
        groupCount: groups.length,
        userCount: users.length,
        expenseCount: expenses.length,
        settlementCount: settlements.length,
      },
      // Serialise Decimal fields to strings to preserve precision across JSON
      users,
      categories,
      groups,
      groupMembers,
      expenses: expenses.map((e) => ({
        ...e,
        totalAmount: e.totalAmount.toString(),
      })),
      expenseParticipants: expenseParticipants.map((p) => ({
        ...p,
        shareAmount: p.shareAmount.toString(),
        percentage: p.percentage?.toString() ?? null,
      })),
      settlements: settlements.map((s) => ({
        ...s,
        amount: s.amount.toString(),
      })),
      invitations,
    };

    return NextResponse.json(snapshot, { status: 200 });
  } catch (error: any) {
    console.error("Audit export error:", error);
    return NextResponse.json(
      { error: "Failed to generate audit export." },
      { status: 500 }
    );
  }
}
