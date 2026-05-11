import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {

  const messages = await db.query(
    `SELECT role,content
     FROM chat_messages
     WHERE session_id=$1
     ORDER BY created_at`,
    [params.id]
  )

  return NextResponse.json({ messages: messages.rows })
}