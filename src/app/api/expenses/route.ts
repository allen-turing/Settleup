import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST /api/expenses - Add a new shared expense
export async function POST(request: Request) {
  try {
    const payload = await getCurrentUser();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      groupId,
      title,
      description,
      totalAmount,
      paidById,
      categoryId,
      splitType,
      expenseDate,
      currency = "INR",
      receiptUrl,
      participants, // Array of { userId, percentage?, shares?, shareAmount? }
    } = body;

    // Basic Validation
    if (!groupId || !title || !totalAmount || !paidById || !categoryId || !splitType || !expenseDate || !participants || participants.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields for creating expense." },
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

    // Verify group exists and paidById is a member
    const groupMemberCount = await prisma.groupMember.count({
      where: {
        groupId,
        userId: paidById,
      },
    });

    if (groupMemberCount === 0) {
      return NextResponse.json(
        { error: "The selected payer is not a member of this group." },
        { status: 400 }
      );
    }

    // Process participant share amounts based on split type
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

      participantData = participants.map((p: any, idx: number) => {
        // Distribute remainder pennies to the first few participants
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

      // Adjust penny rounding discrepancies
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

      // Adjust penny rounding discrepancies
      const diff = Number((parsedTotal - shareSum).toFixed(2));
      if (Math.abs(diff) > 0.005 && participantData.length > 0) {
        participantData[0].shareAmount = Number((participantData[0].shareAmount + diff).toFixed(2));
      }
    } else {
      return NextResponse.json({ error: "Invalid split type specified." }, { status: 400 });
    }

    // Double check if all participants exist in group
    const participantUserIds = participantData.map((p) => p.userId);
    const existingGroupMembersCount = await prisma.groupMember.count({
      where: {
        groupId,
        userId: { in: participantUserIds },
      },
    });

    if (existingGroupMembersCount !== participantUserIds.length) {
      return NextResponse.json(
        { error: "One or more participants are not members of the group." },
        { status: 400 }
      );
    }

    // Write to database using transactional consistency
    const expense = await prisma.$transaction(async (tx) => {
      // 1. Create main expense entry
      const exp = await tx.expense.create({
        data: {
          groupId,
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

      // 2. Create the associated participants record
      await tx.expenseParticipant.createMany({
        data: participantData.map((p) => ({
          expenseId: exp.id,
          userId: p.userId,
          shareAmount: p.shareAmount,
          percentage: p.percentage || null,
          shares: p.shares || null,
        })),
      });

      return exp;
    });

    return NextResponse.json(
      { message: "Expense logged successfully.", expense },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create expense error:", error);
    return NextResponse.json(
      { error: "An error occurred creating the expense." },
      { status: 500 }
    );
  }
}
