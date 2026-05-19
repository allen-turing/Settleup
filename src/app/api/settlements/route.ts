import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST /api/settlements - Log a new payment/settlement
export async function POST(request: Request) {
  try {
    const payload = await getCurrentUser();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      groupId,
      paidById,
      paidToId,
      amount,
      settlementDate,
      note,
    } = body;

    // Validation
    if (!groupId || !paidById || !paidToId || !amount || !settlementDate) {
      return NextResponse.json(
        { error: "Missing required fields for logging settlement." },
        { status: 400 }
      );
    }

    const parsedAmount = Number(Number(amount).toFixed(2));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json(
        { error: "Settlement amount must be a positive number." },
        { status: 400 }
      );
    }

    if (paidById === paidToId) {
      return NextResponse.json(
        { error: "Payer and receiver cannot be the same user." },
        { status: 400 }
      );
    }

    // Verify requester is a member of the group
    const requesterMembership = await prisma.groupMember.count({
      where: {
        groupId,
        userId: payload.userId,
      },
    });

    if (requesterMembership === 0) {
      return NextResponse.json(
        { error: "Access denied. You are not a member of this group." },
        { status: 403 }
      );
    }

    // Verify both payer and receiver are group members
    const membersCount = await prisma.groupMember.count({
      where: {
        groupId,
        userId: { in: [paidById, paidToId] },
      },
    });

    if (membersCount !== 2) {
      return NextResponse.json(
        { error: "The payer or receiver is not a member of this group." },
        { status: 400 }
      );
    }

    // Create settlement record
    const settlement = await prisma.settlement.create({
      data: {
        groupId,
        paidById,
        paidToId,
        amount: parsedAmount,
        settlementDate: new Date(settlementDate),
        note: note || "",
      },
    });

    return NextResponse.json(
      { message: "Settlement recorded successfully.", settlement },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create settlement error:", error);
    return NextResponse.json(
      { error: "An error occurred logging the settlement." },
      { status: 500 }
    );
  }
}
