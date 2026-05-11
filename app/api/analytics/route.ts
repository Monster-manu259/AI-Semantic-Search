import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback_secret_change_me"
);

export async function GET(request: NextRequest) {
  try {

    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    const requesterId = payload.id as string;

    const roleRes = await db.query(
      "SELECT role FROM users WHERE id = $1",
      [requesterId]
    );

    const requesterRole = roleRes.rows[0]?.role;

    const { searchParams } = new URL(request.url);

    const userIdParam = searchParams.get("userId");
    const type = searchParams.get("type") || "queries";
    const limit = parseInt(searchParams.get("limit") || "100");


    let targetUserId: string | null;

    if (requesterRole === "admin") {
      targetUserId = userIdParam || null;
    } else {
      targetUserId = requesterId; 
    }


    if (type === "queries") {

      const result = await db.query(
        `
        SELECT
          id,
          query_text,
          search_type,
          results_count,
          created_at
        FROM search_queries
        WHERE ($1::uuid IS NULL OR user_id = $1)
        ORDER BY created_at DESC
        LIMIT $2
        `,
        [targetUserId, limit]
      );

      const queries = result.rows;

      const totalQueries = queries.length;

      const totalResults = queries.reduce(
        (sum, q) => sum + (q.results_count || 0),
        0
      );

      const searchTypes = queries.reduce(
        (acc: Record<string, number>, q) => {
          acc[q.search_type] = (acc[q.search_type] || 0) + 1;
          return acc;
        },
        {}
      );

      return NextResponse.json({
        queries,
        stats: {
          totalQueries,
          averageResults: totalQueries
            ? totalResults / totalQueries
            : 0,
          searchTypes,
        },
      });
    }

    if (type === "documents") {

      const docsResult = await db.query(
        `
        SELECT id, title, status, created_at
        FROM documents
        WHERE ($1::uuid IS NULL OR user_id = $1)
        ORDER BY created_at DESC
        LIMIT $2
        `,
        [targetUserId, limit]
      );

      const documents = docsResult.rows;

      if (!documents.length) {
        return NextResponse.json({
          documents: [],
          stats: {
            totalDocuments: 0,
            byStatus: {},
            totalChunks: 0
          }
        });
      }

      const docIds = documents.map((d) => d.id);

      const chunksResult = await db.query(
        `
        SELECT document_id, id
        FROM document_chunks
        WHERE document_id = ANY($1::uuid[])
        `,
        [docIds]
      );

      const chunks = chunksResult.rows;

      const chunkCounts: Record<string, number> = {};

      chunks.forEach((chunk) => {
        chunkCounts[chunk.document_id] =
          (chunkCounts[chunk.document_id] || 0) + 1;
      });

      const byStatus = documents.reduce(
        (acc: Record<string, number>, d) => {
          acc[d.status] = (acc[d.status] || 0) + 1;
          return acc;
        },
        {}
      );

      return NextResponse.json({
        documents: documents.map((doc) => ({
          ...doc,
          chunkCount: chunkCounts[doc.id] || 0
        })),
        stats: {
          totalDocuments: documents.length,
          byStatus,
          totalChunks: chunks.length
        }
      });
    }


    if (type === "clicks") {

      const result = await db.query(
        `
        SELECT
          sa.id,
          sa.query_id,
          sa.chunk_id,
          sa.clicked,
          sa.created_at,
          sq.query_text,
          dc.document_id,
          dc.content,
          d.title
        FROM search_analytics sa
        JOIN search_queries sq
          ON sa.query_id = sq.id
        JOIN document_chunks dc
          ON sa.chunk_id = dc.id
        JOIN documents d
          ON dc.document_id = d.id
        WHERE ($1::uuid IS NULL OR sq.user_id = $1)
        AND sa.clicked = true
        ORDER BY sa.created_at DESC
        LIMIT $2
        `,
        [targetUserId, limit]
      );

      return NextResponse.json({ analytics: result.rows });
    }


    if (type === "history") {

      const result = await db.query(
        `
        SELECT
          sq.query_text,
          sr.rank_position,
          sr.score,
          dc.content,
          d.title,
          sq.created_at
        FROM search_results sr
        JOIN search_queries sq
          ON sr.query_id = sq.id
        JOIN document_chunks dc
          ON sr.chunk_id = dc.id
        JOIN documents d
          ON dc.document_id = d.id
        WHERE ($1::uuid IS NULL OR sq.user_id = $1)
        ORDER BY sq.created_at DESC
        LIMIT $2
        `,
        [targetUserId, limit]
      );

      return NextResponse.json({ history: result.rows });
    }

    return NextResponse.json(
      { error: "Invalid analytics type" },
      { status: 400 }
    );

  } catch (error) {

    console.error("Analytics error:", error);

    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}