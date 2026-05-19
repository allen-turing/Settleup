import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateBalances } from "@/lib/debtSimplifier";

// DELETE /api/groups/[id]/members/[userId] - Remove a member from the group (only if fully settled up)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const payload = await getCurrentUser();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId, userId: targetUserId } = await params;

    // Verify if the current user is a member of the group
    const requesterMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: payload.userId,
        },
      },
    });

    if (!requesterMembership) {
      return NextResponse.json(
        { error: "Access denied. You cannot manage members in this group." },
        { status: 403 }
      );
    }

    // Retrieve group and related details to calculate balances
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        expenses: {
          include: {
            participants: true,
          },
        },
        settlements: true,
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found." }, { status: 404 });
    }

    // Check if the target user is in the group
    const targetMembership = group.members.find((m) => m.userId === targetUserId);
    if (!targetMembership) {
      return NextResponse.json({ error: "This user is not a member of the group." }, { status: 404 });
    }

    // Calculate balances to ensure target user is settled up (balance === 0)
    const balances = calculateBalances(group.members, group.expenses, group.settlements);
    const targetBalance = balances.find((b) => b.userId === targetUserId);

    if (targetBalance && Math.abs(targetBalance.netBalance) > 0.005) {
      return NextResponse.json(
        {
          error: `Cannot remove member. ${targetMembership.user.name} has an active balance of ${targetBalance.netBalance > 0 ? "+" : ""}${targetBalance.netBalance} INR and must be settled up first.`,
        },
        { status: 400 }
      );
    }

    // Delete membership
    await prisma.groupMember.delete({
      where: {
        groupId_userId: {
          groupId,
          userId: targetUserId,
        },
      },
    });

    return NextResponse.json(
      { message: "Member removed successfully from the group." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Remove member error:", error);
    return NextResponse.json(
      { error: "An error occurred removing group member." },
      { status: 500 }
    );
  }
}
