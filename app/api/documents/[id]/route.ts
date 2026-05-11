import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  deleteDocument,
  getDocumentWithChunks,
  reprocessDocument,
} from "@/lib/document-processor";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;

    const result = await getDocumentWithChunks(documentId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Document fetch error:", error);

    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId"); // Pass this from frontend

    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [docRes, userRes] = await Promise.all([
      db.query('SELECT user_id FROM documents WHERE id = $1', [documentId]),
      db.query('SELECT role FROM users WHERE id = $1', [userId])
    ]);

    const doc = docRes.rows[0];
    const requesterRole = userRes.rows[0]?.role;

    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (doc.user_id !== userId && requesterRole !== 'admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteDocument(documentId);

    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    console.error("Document deletion error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;
    const body = await request.json();

    const { action, title, content, metadata } = body;

    if (action === "reprocess") {

      await db.query(
        `
    UPDATE documents
    SET status = 'processing',
        updated_at = NOW()
    WHERE id = $1
    `,
        [documentId]
      );

      await db.query(
        `
    DELETE FROM document_chunks
    WHERE document_id = $1
    `,
        [documentId]
      );

      reprocessDocument(documentId).catch((error: any) => {
        console.error("Reprocess error:", error);
      });

      return NextResponse.json({
        success: true,
        message: "Document reprocessing started",
      });
    }
    const result = await db.query(
      `
      UPDATE documents
      SET
        title = COALESCE($1, title),
        content = COALESCE($2, content),
        metadata = COALESCE($3, metadata),
        updated_at = NOW()
      WHERE id = $4
      RETURNING *
      `,
      [title, content, metadata, documentId]
    );

    const document = result.rows[0];

    return NextResponse.json({ document });
  } catch (error) {
    console.error("Document update error:", error);

    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    );
  }
}