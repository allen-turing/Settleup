import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, signToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email and password are required fields." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      // If it is a placeholder account (empty passwordHash), we allow claiming it
      if (existingUser.passwordHash === "") {
        const passwordHash = await hashPassword(password);
        const user = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name,
            passwordHash,
          },
        });

        // Generate JWT token
        const token = await signToken({ userId: user.id, email: user.email });

        // Build the response and set cookie
        const response = NextResponse.json(
          {
            message: "Account activated successfully.",
            user: { id: user.id, name: user.name, email: user.email },
          },
          { status: 201 }
        );

        response.cookies.set("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7, // 7 days
          path: "/",
        });

        return response;
      }

      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 400 }
      );
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
      },
    });

    // Generate JWT token
    const token = await signToken({ userId: user.id, email: user.email });

    // Build the response and set cookie
    const response = NextResponse.json(
      {
        message: "Account created successfully.",
        user: { id: user.id, name: user.name, email: user.email },
      },
      { status: 201 }
    );

    // Set cookie (HTTP-only, secure, sameSite lax, path /)
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during signup." },
      { status: 500 }
    );
  }
}
