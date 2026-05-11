import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "fallback_secret_change_me");

export async function GET(request: NextRequest) {
    const token = request.cookies.get("auth-token")?.value;
    
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        const userId = payload.id;

        const result = await db.query('SELECT id, email, role FROM users WHERE id = $1', [userId]);
        
        if (result.rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

        return NextResponse.json(result.rows[0]);
    } catch (err) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
}