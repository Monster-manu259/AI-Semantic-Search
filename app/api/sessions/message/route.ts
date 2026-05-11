import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function POST(req: Request) {

  const { sessionId, role, content } = await req.json()

  await db.query(
    `INSERT INTO chat_messages
     (session_id,role,content)
     VALUES ($1,$2,$3)`,
    [sessionId, role, content]
  )

  return NextResponse.json({ success: true })
}