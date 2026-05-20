import { NextResponse } from "next/server";
import { getCurrentUser, hashPassword, comparePassword, signToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const payload = await getCurrentUser();

    if (!payload) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User account not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error: any) {
    console.error("Auth Me error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred fetching user profile." },
      { status: 500 }
    );
  }
}

// PATCH /api/auth/me
// Supports updating: name, email, password (requires currentPassword for auth)
export async function PATCH(request: Request) {
  try {
    const payload = await getCurrentUser();
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, currentPassword, newPassword } = body;

    // Fetch the full user record (need passwordHash for verification)
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const updates: Record<string, string> = {};

    // --- Name update ---
    if (name !== undefined) {
      const trimmed = name.trim();
      if (!trimmed) {
        return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
      }
      updates.name = trimmed;
    }

    // --- Email update ---
    if (email !== undefined) {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
      }
      if (trimmed !== user.email) {
        const existing = await prisma.user.findUnique({ where: { email: trimmed } });
        if (existing) {
          return NextResponse.json(
            { error: "This email is already in use by another account." },
            { status: 409 }
          );
        }
        updates.email = trimmed;
      }
    }

    // --- Password update ---
    if (newPassword !== undefined) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: "Current password is required to set a new password." },
          { status: 400 }
        );
      }
      const valid = await comparePassword(currentPassword, user.passwordHash);
      if (!valid) {
        return NextResponse.json(
          { error: "Current password is incorrect." },
          { status: 400 }
        );
      }
      if (newPassword.length < 8) {
        return NextResponse.json(
          { error: "New password must be at least 8 characters." },
          { status: 400 }
        );
      }
      updates.passwordHash = await hashPassword(newPassword);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No changes provided." }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: payload.userId },
      data: updates,
      select: { id: true, name: true, email: true, createdAt: true },
    });

    // If email changed, re-issue JWT so middleware stays valid
    const response = NextResponse.json(
      { message: "Profile updated successfully.", user: updated },
      { status: 200 }
    );

    if (updates.email) {
      const newToken = await signToken({ userId: updated.id, email: updated.email });
      response.cookies.set("token", newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
    }

    return response;
  } catch (error: any) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred updating your profile." },
      { status: 500 }
    );
  }
}
