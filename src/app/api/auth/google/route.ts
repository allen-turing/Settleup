import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("group") || "";

    const clientFlag = process.env.GOOGLE_CLIENT_ID;
    if (!clientFlag) {
      console.error("❌ GOOGLE_CLIENT_ID is not configured in environment variables.");
      return NextResponse.json(
        { error: "Google OAuth is not configured on this server." },
        { status: 500 }
      );
    }

    const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    const options = {
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/google/callback`,
      client_id: clientFlag,
      access_type: "offline",
      response_type: "code",
      prompt: "consent",
      scope: [
        "https://www.googleapis.com/auth/userinfo.profile",
        "https://www.googleapis.com/auth/userinfo.email",
      ].join(" "),
      state: groupId, // Pass group ID in state to persist invitation flow
    };

    const qs = new URLSearchParams(options);
    return NextResponse.redirect(`${rootUrl}?${qs.toString()}`);
  } catch (error: any) {
    console.error("Error in Google Auth redirect:", error);
    return NextResponse.json(
      { error: "Failed to initiate Google Authentication." },
      { status: 500 }
    );
  }
}
