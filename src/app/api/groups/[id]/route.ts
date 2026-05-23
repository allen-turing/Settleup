import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateBalances, simplifyDebts } from "@/lib/debtSimplifier";

// GET /api/groups/[id] - Fetch detailed group data, including balances and simplified debts
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

    // Check if the current user is a member of the group
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

    // Retrieve group with members, expenses, and settlements
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, upiId: true },
            },
          },
          orderBy: {
            joinedAt: "asc",
          },
        },
        expenses: {
          include: {
            paidBy: {
              select: { id: true, name: true, email: true },
            },
            category: true,
            participants: {
              include: {
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
          orderBy: {
            expenseDate: "desc",
          },
        },
        settlements: {
          include: {
            paidBy: {
              select: { id: true, name: true, email: true },
            },
            paidTo: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: {
            settlementDate: "desc",
          },
        },
        invitations: {
          orderBy: {
            invitedAt: "desc",
          },
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found." }, { status: 404 });
    }

    // Calculate balances and simplified settlements
    const balances = calculateBalances(group.members, group.expenses, group.settlements);
    const simplifiedTransactions = simplifyDebts(balances);

    return NextResponse.json(
      {
        group: {
          id: group.id,
          name: group.name,
          description: group.description,
          createdAt: group.createdAt,
          createdById: group.createdById,
        },
        members: group.members.map((m) => ({
          userId: m.user.id,
          name: m.user.name,
          email: m.user.email,
          upiId: m.user.upiId,
          joinedAt: m.joinedAt,
        })),
        invitations: group.invitations,
        expenses: group.expenses,
        settlements: group.settlements,
        balances,
        simplifiedTransactions,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Fetch group details error:", error);
    return NextResponse.json(
      { error: "An error occurred fetching group details." },
      { status: 500 }
    );
  }
}

// PATCH /api/groups/[id] - Update group name and description
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getCurrentUser();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;
    const body = await request.json();
    const { name, description } = body;

    // Verify if the current user is a member of the group
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

    if (name !== undefined && !name.trim()) {
      return NextResponse.json(
        { error: "Group name cannot be empty." },
        { status: 400 }
      );
    }

    const updatedGroup = await prisma.group.update({
      where: { id: groupId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description.trim() }),
      },
    });

    return NextResponse.json(
      {
        message: "Group updated successfully.",
        group: {
          id: updatedGroup.id,
          name: updatedGroup.name,
          description: updatedGroup.description,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Update group error:", error);
    return NextResponse.json(
      { error: "An error occurred updating the group." },
      { status: 500 }
    );
  }
}
