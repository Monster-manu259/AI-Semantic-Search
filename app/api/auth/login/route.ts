import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback_secret_change_me");

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await new SignJWT({ 
        id: user.id, 
        email: user.email, 
        role: user.role 
      })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(JWT_SECRET);

    await db.query("UPDATE users SET last_login = NOW() WHERE id = $1", [user.id]);

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, role: user.role }
    });

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, 
      path: "/",
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}