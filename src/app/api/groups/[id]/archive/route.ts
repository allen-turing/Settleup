import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST /api/groups/[id]/archive - Toggle archive status for current user
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
    const body = await request.json();
    const { isArchived } = body;

    if (isArchived === undefined) {
      return NextResponse.json(
        { error: "isArchived field is required." },
        { status: 400 }
      );
    }

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

    // Update isArchived field for this membership
    const updatedMembership = await prisma.groupMember.update({
      where: {
        groupId_userId: {
          groupId,
          userId: payload.userId,
        },
      },
      data: {
        isArchived: !!isArchived,
      },
    });

    return NextResponse.json(
      {
        message: isArchived
          ? "Group successfully archived for you."
          : "Group successfully unarchived for you.",
        isArchived: updatedMembership.isArchived,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Archive group error:", error);
    return NextResponse.json(
      { error: "An error occurred archiving the group." },
      { status: 500 }
    );
  }
}
