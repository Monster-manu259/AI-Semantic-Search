import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: Request) {

  const { userId, title } = await req.json()

  const session = await db.query(
    `INSERT INTO chat_sessions (user_id, title)
     VALUES ($1,$2)
     RETURNING *`,
    [userId, title]
  )

  return NextResponse.json(session.rows[0])
}