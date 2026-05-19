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
    const directAddEnabled = process.env.DIRECT_ADD_ENABLED !== "false";

    if (!directAddEnabled) {
      // 1. Check if user is already a member of the group
      const existingUser = await prisma.user.findUnique({
        where: { email: cleanEmail },
        include: {
          groups: {
            where: { groupId },
          },
        },
      });

      if (existingUser && existingUser.groups.length > 0) {
        return NextResponse.json(
          { error: "This user is already a member of this group." },
          { status: 400 }
        );
      }

      // 2. Check if an invitation is already pending
      const existingInvitation = await prisma.groupInvitation.findUnique({
        where: {
          groupId_email: {
            groupId,
            email: cleanEmail,
          },
        },
      });

      if (existingInvitation) {
        return NextResponse.json(
          { error: "An invitation is already pending for this email address." },
          { status: 400 }
        );
      }

      // 3. Create a pending invitation
      const invitation = await prisma.groupInvitation.create({
        data: {
          groupId,
          email: cleanEmail,
        },
      });

      return NextResponse.json(
        {
          message: "Invitation sent successfully by email.",
          invitation: { id: invitation.id, email: invitation.email, invitedAt: invitation.invitedAt },
        },
        { status: 201 }
      );
    }

    // DIRECT ADD FLOW (POC Mode - DIRECT_ADD_ENABLED = true)
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
