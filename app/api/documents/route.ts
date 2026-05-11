import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { processDocument } from "@/lib/document-processor";
import { canPerformAction } from "@/lib/auth-utils";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback_secret_change_me"
);


export async function POST(request: NextRequest) {
  try {

    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;

    const body = await request.json();

    const { title, content, sourceUrl, metadata } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "Missing required fields: title, content" },
        { status: 400 }
      );
    }

    const userRes = await db.query(
      "SELECT role FROM users WHERE id = $1",
      [userId]
    );

    const userRole = userRes.rows[0]?.role;

    if (!userRole || !canPerformAction(userRole, "user")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const result = await db.query(
      `
      INSERT INTO documents
      (title, content, source_url, metadata, status, user_id)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
      `,
      [
        title,
        content,
        sourceUrl || null,
        metadata || {},
        "pending",
        userId,
      ]
    );

    const document = result.rows[0];

    processDocument(document.id).catch((error: any) => {
      console.error("Background processing error:", error);
    });

    return NextResponse.json({
      success: true,
      document,
      message: "Document created and queued for processing",
    });

  } catch (error) {
    console.error("Document creation error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {

    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const userId = payload.id as string;

    const roleRes = await db.query(
      "SELECT role FROM users WHERE id = $1",
      [userId]
    );

    const requesterRole = roleRes.rows[0]?.role;

    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");

    let query = "";
    const params: any[] = [];

    if (requesterRole === "admin") {
      query = `SELECT * FROM documents`;
    } else {
      query = `SELECT * FROM documents WHERE user_id = $1`;
      params.push(userId);
    }

    if (status) {
      query += requesterRole === "admin"
        ? ` WHERE status = $1`
        : ` AND status = $2`;

      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT ${limit}`;

    const result = await db.query(query, params);

    return NextResponse.json({
      documents: result.rows,
    });

  } catch (error) {

    console.error("Document fetch error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}