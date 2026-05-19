import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// DELETE /api/expenses/[id] - Remove an expense
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getCurrentUser();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: expenseId } = await params;

    // Fetch expense to check group membership
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found." }, { status: 404 });
    }

    // Verify if the current user is a member of the group
    const membership = await prisma.groupMember.count({
      where: {
        groupId: expense.groupId,
        userId: payload.userId,
      },
    });

    if (membership === 0) {
      return NextResponse.json(
        { error: "Access denied. You are not a member of the group." },
        { status: 403 }
      );
    }

    // Delete the expense (Prisma schema onDelete: Cascade will clean up expenseParticipants)
    await prisma.expense.delete({
      where: { id: expenseId },
    });

    return NextResponse.json(
      { message: "Expense deleted successfully." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Delete expense error:", error);
    return NextResponse.json(
      { error: "An error occurred deleting the expense." },
      { status: 500 }
    );
  }
}

// PUT /api/expenses/[id] - Edit an existing expense
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getCurrentUser();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: expenseId } = await params;
    const body = await request.json();

    const {
      title,
      description,
      totalAmount,
      paidById,
      categoryId,
      splitType,
      expenseDate,
      currency = "INR",
      receiptUrl,
      participants,
    } = body;

    // Fetch existing expense
    const existingExpense = await prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!existingExpense) {
      return NextResponse.json({ error: "Expense not found." }, { status: 404 });
    }

    // Verify requester is in the group
    const membership = await prisma.groupMember.count({
      where: {
        groupId: existingExpense.groupId,
        userId: payload.userId,
      },
    });

    if (membership === 0) {
      return NextResponse.json(
        { error: "Access denied. You are not a member of the group." },
        { status: 403 }
      );
    }

    // Basic fields validation
    if (!title || !totalAmount || !paidById || !categoryId || !splitType || !expenseDate || !participants || participants.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields for updating expense." },
        { status: 400 }
      );
    }

    const parsedTotal = Number(Number(totalAmount).toFixed(2));
    if (isNaN(parsedTotal) || parsedTotal <= 0) {
      return NextResponse.json(
        { error: "Total amount must be a positive number." },
        { status: 400 }
      );
    }

    // Validate payer is a group member
    const payerMembership = await prisma.groupMember.count({
      where: {
        groupId: existingExpense.groupId,
        userId: paidById,
      },
    });

    if (payerMembership === 0) {
      return NextResponse.json(
        { error: "The selected payer is not a member of this group." },
        { status: 400 }
      );
    }

    // Split calculations (Equal, Exact, Percentage, Shares)
    let participantData: {
      userId: string;
      shareAmount: number;
      percentage?: number;
      shares?: number;
    }[] = [];

    if (splitType === "EQUAL") {
      const count = participants.length;
      const baseShare = Math.floor((parsedTotal * 100) / count) / 100;
      let remainder = Number((parsedTotal - baseShare * count).toFixed(2));

      participantData = participants.map((p: any) => {
        const extra = remainder > 0.005 ? 0.01 : 0;
        if (extra > 0) remainder = Number((remainder - 0.01).toFixed(2));

        return {
          userId: p.userId,
          shareAmount: Number((baseShare + extra).toFixed(2)),
        };
      });
    } else if (splitType === "EXACT") {
      let sum = 0;
      participantData = participants.map((p: any) => {
        const amt = Number(Number(p.shareAmount || 0).toFixed(2));
        sum += amt;
        return {
          userId: p.userId,
          shareAmount: amt,
        };
      });

      if (Math.abs(sum - parsedTotal) > 0.01) {
        return NextResponse.json(
          { error: `The sum of exact split amounts (${sum.toFixed(2)}) must equal the total expense amount (${parsedTotal.toFixed(2)}).` },
          { status: 400 }
        );
      }
    } else if (splitType === "PERCENTAGE") {
      let percentSum = 0;
      participants.forEach((p: any) => {
        percentSum += Number(p.percentage || 0);
      });

      if (Math.abs(percentSum - 100) > 0.01) {
        return NextResponse.json(
          { error: `The sum of percentages (${percentSum}%) must equal 100%.` },
          { status: 400 }
        );
      }

      let shareSum = 0;
      participantData = participants.map((p: any) => {
        const percent = Number(p.percentage || 0);
        const amt = Number(((percent / 100) * parsedTotal).toFixed(2));
        shareSum += amt;
        return {
          userId: p.userId,
          shareAmount: amt,
          percentage: percent,
        };
      });

      const diff = Number((parsedTotal - shareSum).toFixed(2));
      if (Math.abs(diff) > 0.005 && participantData.length > 0) {
        participantData[0].shareAmount = Number((participantData[0].shareAmount + diff).toFixed(2));
      }
    } else if (splitType === "SHARES") {
      let totalShares = 0;
      participants.forEach((p: any) => {
        totalShares += Number(p.shares || 0);
      });

      if (totalShares <= 0) {
        return NextResponse.json(
          { error: "Total shares must be greater than 0." },
          { status: 400 }
        );
      }

      let shareSum = 0;
      participantData = participants.map((p: any) => {
        const shares = Number(p.shares || 0);
        const amt = Number(((shares / totalShares) * parsedTotal).toFixed(2));
        shareSum += amt;
        return {
          userId: p.userId,
          shareAmount: amt,
          shares: shares,
        };
      });

      const diff = Number((parsedTotal - shareSum).toFixed(2));
      if (Math.abs(diff) > 0.005 && participantData.length > 0) {
        participantData[0].shareAmount = Number((participantData[0].shareAmount + diff).toFixed(2));
      }
    } else {
      return NextResponse.json({ error: "Invalid split type specified." }, { status: 400 });
    }

    // Verify all participants are in the group
    const participantUserIds = participantData.map((p) => p.userId);
    const existingGroupMembersCount = await prisma.groupMember.count({
      where: {
        groupId: existingExpense.groupId,
        userId: { in: participantUserIds },
      },
    });

    if (existingGroupMembersCount !== participantUserIds.length) {
      return NextResponse.json(
        { error: "One or more participants are not members of the group." },
        { status: 400 }
      );
    }

    // Update using transactional isolation
    const updatedExpense = await prisma.$transaction(async (tx) => {
      // 1. Delete existing participant entries
      await tx.expenseParticipant.deleteMany({
        where: { expenseId },
      });

      // 2. Update main expense properties
      const exp = await tx.expense.update({
        where: { id: expenseId },
        data: {
          title,
          description: description || "",
          totalAmount: parsedTotal,
          paidById,
          categoryId,
          splitType,
          expenseDate: new Date(expenseDate),
          currency,
          receiptUrl: receiptUrl || "",
        },
      });

      // 3. Create fresh participant splits
      await tx.expenseParticipant.createMany({
        data: participantData.map((p) => ({
          expenseId,
          userId: p.userId,
          shareAmount: p.shareAmount,
          percentage: p.percentage || null,
          shares: p.shares || null,
        })),
      });

      return exp;
    });

    return NextResponse.json(
      { message: "Expense updated successfully.", expense: updatedExpense },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Update expense error:", error);
    return NextResponse.json(
      { error: "An error occurred updating the expense." },
      { status: 500 }
    );
  }
}
