import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST /api/groups/[id]/join - Join a group using an invite link
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await getCurrentUser();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: groupId } = await params;

    // 1. Verify if the group exists
    const group = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found." }, { status: 404 });
    }

    // 2. Check if the user is already a member
    const existingMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: payload.userId,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { message: "You are already a member of this group.", groupId },
        { status: 200 }
      );
    }

    // 3. Add user to the group
    await prisma.groupMember.create({
      data: {
        groupId,
        userId: payload.userId,
      },
    });

    return NextResponse.json(
      { message: "Successfully joined the group.", groupId },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Join group error:", error);
    return NextResponse.json(
      { error: "An error occurred joining the group." },
      { status: 500 }
    );
  }
}
