import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { email, password, fullName } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const existingUser = await db.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const userCount = await db.query("SELECT count(*) FROM users");
    const role = parseInt(userCount.rows[0].count) === 0 ? 'admin' : 'user';

    const result = await db.query(
      `INSERT INTO users (email, password_hash, full_name, role) 
       VALUES ($1, $2, $3, $4) RETURNING id, email, role`,
      [email, hashedPassword, fullName, role]
    );

    return NextResponse.json({ user: result.rows[0], message: "User registered successfully" });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requesterId = searchParams.get("adminId");

    const check = await db.query("SELECT role FROM users WHERE id = $1", [requesterId]);
    if (check.rows[0]?.role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const users = await db.query("SELECT id, email, role, full_name, created_at FROM users ORDER BY created_at DESC");
    return NextResponse.json({ users: users.rows });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}