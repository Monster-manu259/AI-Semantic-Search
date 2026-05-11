import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: Request) {

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")

  const sessions = await db.query(
    `SELECT * FROM chat_sessions
     WHERE user_id=$1
     ORDER BY created_at DESC`,
    [userId]
  )

  return NextResponse.json({ sessions: sessions.rows })
}