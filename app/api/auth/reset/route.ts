import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function PATCH(request: NextRequest) {
  try {
    const { email, newPassword } = await request.json();
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const result = await db.query(
      "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2 RETURNING id",
      [hashedPassword, email]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Password updated" });
  } catch (error) {
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}