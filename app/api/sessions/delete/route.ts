import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get("sessionId")

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 })
    }

    await db.query(`DELETE FROM chat_sessions WHERE id = $1`, [sessionId])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete session error:", error)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}