import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

// POST /api/groups/[id]/members - Add a member to the group by email
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
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

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
        { error: "Access denied. You cannot invite members to this group." },
        { status: 403 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if the user exists
    let targetUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    // If user does not exist, create a placeholder account
    if (!targetUser) {
      const emailName = cleanEmail.split("@")[0];
      // Format human-readable capitalized name from email username
      const cleanName = emailName
        .split(/[._-]/)
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      targetUser = await prisma.user.create({
        data: {
          name: cleanName,
          email: cleanEmail,
          passwordHash: "", // Empty hash signifies a placeholder account
        },
      });
    }

    // Check if they are already in the group
    const existingMembership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: targetUser.id,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: "This user is already a member of this group." },
        { status: 400 }
      );
    }

    // Add to group
    await prisma.groupMember.create({
      data: {
        groupId,
        userId: targetUser.id,
      },
    });

    return NextResponse.json(
      {
        message: "Member added successfully.",
        user: { id: targetUser.id, name: targetUser.name, email: targetUser.email },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Add member error:", error);
    return NextResponse.json(
      { error: "An error occurred adding group member." },
      { status: 500 }
    );
  }
}
