import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST /api/audit/import
// Accepts an audit JSON snapshot (produced by /api/audit/export) and
// idempotently recreates every entity — safe to run multiple times.
// All upserts are keyed on stable IDs, so re-running won't duplicate data.
export async function POST(request: Request) {
  try {
    const payload = await getCurrentUser();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      users = [],
      categories = [],
      groups = [],
      groupMembers = [],
      expenses = [],
      expenseParticipants = [],
      settlements = [],
      invitations = [],
    } = body;

    const results = {
      users: 0,
      categories: 0,
      groups: 0,
      groupMembers: 0,
      expenses: 0,
      expenseParticipants: 0,
      settlements: 0,
      invitations: 0,
      skipped: [] as string[],
    };

    // ── 1. Users ──────────────────────────────────────────────────────────────
    // We upsert by email (unique). We never restore passwordHash from the export
    // (it's excluded at export time). Placeholder accounts get an empty hash.
    for (const u of users) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: { name: u.name },
        create: {
          id: u.id,
          name: u.name,
          email: u.email,
          passwordHash: "", // placeholder — user must reset password
          createdAt: new Date(u.createdAt),
        },
      });
      results.users++;
    }

    // ── 2. Categories ─────────────────────────────────────────────────────────
    for (const c of categories) {
      await prisma.category.upsert({
        where: { name: c.name },
        update: { icon: c.icon, color: c.color },
        create: {
          id: c.id,
          name: c.name,
          icon: c.icon ?? null,
          color: c.color ?? null,
        },
      });
      results.categories++;
    }

    // ── 3. Groups ─────────────────────────────────────────────────────────────
    for (const g of groups) {
      // Verify the createdBy user exists first; skip if missing
      const creatorExists = await prisma.user.findUnique({
        where: { id: g.createdById },
        select: { id: true },
      });
      if (!creatorExists) {
        results.skipped.push(`Group ${g.id}: creator ${g.createdById} not found`);
        continue;
      }

      await prisma.group.upsert({
        where: { id: g.id },
        update: { name: g.name, description: g.description },
        create: {
          id: g.id,
          name: g.name,
          description: g.description ?? null,
          createdById: g.createdById,
          createdAt: new Date(g.createdAt),
        },
      });
      results.groups++;
    }

    // ── 4. Group Members ──────────────────────────────────────────────────────
    for (const m of groupMembers) {
      try {
        await prisma.groupMember.upsert({
          where: { groupId_userId: { groupId: m.groupId, userId: m.userId } },
          update: {},
          create: {
            groupId: m.groupId,
            userId: m.userId,
            joinedAt: new Date(m.joinedAt),
          },
        });
        results.groupMembers++;
      } catch {
        results.skipped.push(`GroupMember ${m.groupId}/${m.userId}: group or user missing`);
      }
    }

    // ── 5. Expenses ───────────────────────────────────────────────────────────
    for (const e of expenses) {
      try {
        await prisma.expense.upsert({
          where: { id: e.id },
          update: {
            title: e.title,
            description: e.description ?? null,
            totalAmount: parseFloat(e.totalAmount),
            paidById: e.paidById,
            categoryId: e.categoryId,
            splitType: e.splitType,
            expenseDate: new Date(e.expenseDate),
            currency: e.currency ?? "INR",
            receiptUrl: e.receiptUrl ?? null,
          },
          create: {
            id: e.id,
            groupId: e.groupId,
            title: e.title,
            description: e.description ?? null,
            totalAmount: parseFloat(e.totalAmount),
            paidById: e.paidById,
            categoryId: e.categoryId,
            splitType: e.splitType,
            expenseDate: new Date(e.expenseDate),
            currency: e.currency ?? "INR",
            receiptUrl: e.receiptUrl ?? null,
            createdAt: new Date(e.createdAt),
          },
        });
        results.expenses++;
      } catch {
        results.skipped.push(`Expense ${e.id}: ${e.title}`);
      }
    }

    // ── 6. Expense Participants ───────────────────────────────────────────────
    for (const p of expenseParticipants) {
      try {
        await prisma.expenseParticipant.upsert({
          where: {
            expenseId_userId: { expenseId: p.expenseId, userId: p.userId },
          },
          update: {
            shareAmount: parseFloat(p.shareAmount),
            percentage: p.percentage != null ? parseFloat(p.percentage) : null,
            shares: p.shares ?? null,
            isSettled: p.isSettled ?? false,
          },
          create: {
            expenseId: p.expenseId,
            userId: p.userId,
            shareAmount: parseFloat(p.shareAmount),
            percentage: p.percentage != null ? parseFloat(p.percentage) : null,
            shares: p.shares ?? null,
            isSettled: p.isSettled ?? false,
          },
        });
        results.expenseParticipants++;
      } catch {
        results.skipped.push(`ExpenseParticipant ${p.expenseId}/${p.userId}`);
      }
    }

    // ── 7. Settlements ────────────────────────────────────────────────────────
    for (const s of settlements) {
      try {
        await prisma.settlement.upsert({
          where: { id: s.id },
          update: {
            amount: parseFloat(s.amount),
            note: s.note ?? null,
          },
          create: {
            id: s.id,
            groupId: s.groupId,
            paidById: s.paidById,
            paidToId: s.paidToId,
            amount: parseFloat(s.amount),
            settlementDate: new Date(s.settlementDate),
            note: s.note ?? null,
            createdAt: new Date(s.createdAt),
          },
        });
        results.settlements++;
      } catch {
        results.skipped.push(`Settlement ${s.id}`);
      }
    }

    // ── 8. Invitations ────────────────────────────────────────────────────────
    for (const inv of invitations) {
      try {
        await prisma.groupInvitation.upsert({
          where: { groupId_email: { groupId: inv.groupId, email: inv.email } },
          update: {},
          create: {
            id: inv.id,
            groupId: inv.groupId,
            email: inv.email,
            invitedAt: new Date(inv.invitedAt),
          },
        });
        results.invitations++;
      } catch {
        results.skipped.push(`Invitation ${inv.id}`);
      }
    }

    return NextResponse.json(
      {
        message: "Audit import completed successfully.",
        imported: results,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Audit import error:", error);
    return NextResponse.json(
      { error: "Failed to process audit import." },
      { status: 500 }
    );
  }
}
