import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/groups/[id]/analytics - Retrieve spending insights, category breakdown and trends
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getCurrentUser();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;

    // Verify group membership
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: payload.userId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Access denied. You are not a member of this group." },
        { status: 403 }
      );
    }

    // Retrieve group members and expenses with category and participant shares
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
        expenses: {
          include: {
            category: true,
            participants: true,
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found." }, { status: 404 });
    }

    const expenses = group.expenses;

    // Helper to safely convert Decimal values
    const toNum = (val: any): number => {
      if (typeof val === "object" && val !== null && "toNumber" in val) {
        return val.toNumber();
      }
      if (typeof val === "string") {
        return parseFloat(val);
      }
      return val || 0;
    };

    // 1. Calculate spending by Category
    const categorySpend: Record<
      string,
      { name: string; icon: string; color: string; totalSpend: number; percentage: number }
    > = {};

    let totalGroupSpend = 0;

    for (const exp of expenses) {
      const cat = exp.category;
      const amt = toNum(exp.totalAmount);
      totalGroupSpend += amt;

      if (!categorySpend[cat.id]) {
        categorySpend[cat.id] = {
          name: cat.name,
          icon: cat.icon || "HelpCircle",
          color: cat.color || "#7F8C8D",
          totalSpend: 0,
          percentage: 0,
        };
      }
      categorySpend[cat.id].totalSpend += amt;
    }

    // Format category spend and calculate percentages
    const categoryBreakdown = Object.values(categorySpend).map((c) => {
      c.totalSpend = Number(c.totalSpend.toFixed(2));
      c.percentage = totalGroupSpend > 0 ? Number(((c.totalSpend / totalGroupSpend) * 100).toFixed(1)) : 0;
      return c;
    });

    // 2. Calculate monthly timeline spending trend
    const monthlySpend: Record<string, number> = {};

    for (const exp of expenses) {
      const date = new Date(exp.expenseDate);
      const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const amt = toNum(exp.totalAmount);

      monthlySpend[yearMonth] = (monthlySpend[yearMonth] || 0) + amt;
    }

    const monthlyTimeline = Object.entries(monthlySpend)
      .map(([month, amount]) => ({
        month,
        amount: Number(amount.toFixed(2)),
      }))
      .sort((a, b) => a.month.localeCompare(b.month)); // Chronological order

    // 3. User Contribution Breakdown (Paid vs Owed)
    const userContributions: Record<string, { name: string; paid: number; owed: number }> = {};

    // Initialize map
    for (const m of group.members) {
      userContributions[m.userId] = {
        name: m.user.name,
        paid: 0,
        owed: 0,
      };
    }

    for (const exp of expenses) {
      const payerId = exp.paidById;
      const amt = toNum(exp.totalAmount);

      if (userContributions[payerId]) {
        userContributions[payerId].paid += amt;
      }

      for (const p of exp.participants) {
        if (userContributions[p.userId]) {
          userContributions[p.userId].owed += toNum(p.shareAmount);
        }
      }
    }

    const contributionsBreakdown = Object.entries(userContributions).map(([userId, stats]) => ({
      userId,
      name: stats.name,
      paid: Number(stats.paid.toFixed(2)),
      owed: Number(stats.owed.toFixed(2)),
    }));

    return NextResponse.json(
      {
        totalSpend: Number(totalGroupSpend.toFixed(2)),
        categoryBreakdown,
        monthlyTimeline,
        contributionsBreakdown,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Fetch group analytics error:", error);
    return NextResponse.json(
      { error: "An error occurred fetching group analytics." },
      { status: 500 }
    );
  }
}
