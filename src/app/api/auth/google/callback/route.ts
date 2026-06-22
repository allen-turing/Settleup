import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state") || ""; // This holds the groupId if any

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=Google authentication failed: Authorization code missing", request.url)
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!clientId || !clientSecret) {
    console.error("❌ Google OAuth credentials are not fully configured.");
    return NextResponse.redirect(
      new URL("/login?error=Google OAuth is not configured on this server.", request.url)
    );
  }

  try {
    const client = new OAuth2Client(
      clientId,
      clientSecret,
      `${appUrl}/api/auth/google/callback`
    );

    // 1. Exchange authorization code for tokens
    const { tokens } = await client.getToken(code);
    const idToken = tokens.id_token;

    if (!idToken) {
      return NextResponse.redirect(
        new URL("/login?error=Google authentication failed: ID token missing from Google response", request.url)
      );
    }

    // 2. Verify the ID token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return NextResponse.redirect(
        new URL("/login?error=Google authentication failed: Invalid token payload returned", request.url)
      );
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || email.split("@")[0];
    const googleId = payload.sub; // Google's unique user identifier

    // 3. Find or create user
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // Account Linking: If user exists but doesn't have googleId linked yet, link it
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId },
        });
      }
    } else {
      // If user doesn't exist, create one with standard placeholder password
      user = await prisma.user.create({
        data: {
          name,
          email,
          googleId,
          passwordHash: "",
        },
      });
    }

    // 4. Handle auto-joining group if groupId is in state
    let redirectUrl = "/dashboard";
    if (state) {
      try {
        const group = await prisma.group.findUnique({
          where: { id: state },
        });

        if (group) {
          // Check if already a member
          const existingMembership = await prisma.groupMember.findUnique({
            where: {
              groupId_userId: {
                groupId: state,
                userId: user.id,
              },
            },
          });

          if (!existingMembership) {
            await prisma.groupMember.create({
              data: {
                groupId: state,
                userId: user.id,
              },
            });
          }
          redirectUrl = `/groups/${state}`;
        }
      } catch (groupError) {
        console.error("Error auto-joining group during Google login callback:", groupError);
      }
    }

    // 5. Generate application JWT token
    const appToken = await signToken({ userId: user.id, email: user.email });

    // 6. Redirect user with token set in HTTP-only cookie
    const response = NextResponse.redirect(new URL(redirectUrl, request.url));
    response.cookies.set("token", appToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("❌ Google Auth callback error:", error);
    const errorMessage = error.message || "Unknown error";
    return NextResponse.redirect(
      new URL(`/login?error=Google authentication failed: ${encodeURIComponent(errorMessage)}`, request.url)
    );
  }
}
