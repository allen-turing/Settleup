import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log("🔍 MIDDLEWARE PATH:", pathname, " | COOKIE:", request.headers.get("cookie"));

  // Define public paths that authenticated users should not visit
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/signup");
  
  // Define private paths that require authentication
  const isDashboardPage =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/groups") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/profile");

  const isApi = pathname.startsWith("/api");
  const isPublicApi =
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/signup") ||
    pathname.startsWith("/api/auth/google");

  // Get the token cookie
  const token = request.cookies.get("token")?.value;
  const userPayload = token ? await verifyToken(token) : null;
  const isAuthenticated = !!userPayload;

  // Handle protected page redirects
  if (isDashboardPage && !isAuthenticated) {
    const url = new URL("/login", request.url);
    // Remember redirect url if helpful
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Handle API authorization checks
  if (isApi && !isPublicApi && !isAuthenticated) {
    return new NextResponse(
      JSON.stringify({ error: "Unauthorized access. Please log in." }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - uploads (receipt image uploads)
     */
    "/((?!_next/static|_next/image|favicon.ico|uploads).*)",
  ],
};
