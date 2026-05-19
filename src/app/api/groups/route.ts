import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateBalances } from "@/lib/debtSimplifier";

// GET /api/groups - List all groups for current authenticated user
export async function GET() {
  try {
    const payload = await getCurrentUser();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find all group memberships for this user
    const memberships = await prisma.groupMember.findMany({
      where: { userId: payload.userId },
      include: {
        group: {
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
        },
      },
      orderBy: {
        joinedAt: "desc",
      },
    });

    const groupsWithBalances = memberships.map((m) => {
      const g = m.group;
      // Calculate balances for this group
      const memberBalances = calculateBalances(g.members, g.expenses, g.settlements);
      const userBalance = memberBalances.find((b) => b.userId === payload.userId);

      return {
        id: g.id,
        name: g.name,
        description: g.description,
        createdAt: g.createdAt,
        createdById: g.createdById,
        memberCount: g.members.length,
        userNetBalance: userBalance ? userBalance.netBalance : 0,
        userTotalPaid: userBalance ? userBalance.totalPaid : 0,
        userTotalOwed: userBalance ? userBalance.totalOwed : 0,
      };
    });

    return NextResponse.json({ groups: groupsWithBalances }, { status: 200 });
  } catch (error: any) {
    console.error("Fetch groups error:", error);
    return NextResponse.json(
      { error: "An error occurred fetching groups." },
      { status: 500 }
    );
  }
}

// POST /api/groups - Create a new group
export async function POST(request: Request) {
  try {
    const payload = await getCurrentUser();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description } = await request.json();
    if (!name) {
      return NextResponse.json({ error: "Group name is required." }, { status: 400 });
    }

    // Create group and add creator as a member in a single transaction
    const newGroup = await prisma.$transaction(async (tx) => {
      const group = await tx.group.create({
        data: {
          name,
          description: description || "",
          createdById: payload.userId,
        },
      });

      await tx.groupMember.create({
        data: {
          groupId: group.id,
          userId: payload.userId,
        },
      });

      return group;
    });

    return NextResponse.json(
      { message: "Group created successfully.", group: newGroup },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create group error:", error);
    return NextResponse.json(
      { error: "An error occurred creating group." },
      { status: 500 }
    );
  }
}
