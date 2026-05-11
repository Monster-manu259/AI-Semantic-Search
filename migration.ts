import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback_secret_change_me");

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/login") || 
    pathname.startsWith("/register") || 
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    if (pathname.startsWith("/analytics") && payload.role !== "admin") {
      return NextResponse.redirect(new URL("/search", request.url));
    }

    return NextResponse.next();
  } catch (err) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/search/:path*",
    "/analytics/:path*",
    "/documents/:path*",
    "/history/:path*",
  ],
};