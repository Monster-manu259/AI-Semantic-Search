import { NextRequest, NextResponse } from "next/server";
import {
  searchDocuments,
  rerankResults,
  trackClick,
  keywordSearch,
  hybridSearch
} from "@/lib/search";
import { db } from "@/lib/db";

const SIMILARITY_THRESHOLD = 0.15;

export async function POST(request: NextRequest) {
  try {

    const body = await request.json();

    const {
      query,
      searchType = "hybrid",
      userId,
      matchCount = 10,
      rerank = true
    } = body;

    if (!query) {
      return NextResponse.json(
        { error: "Missing query parameter" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId" },
        { status: 400 }
      );
    }

    const queryInsert = await db.query(
      `
      INSERT INTO search_queries
      (query_text, search_type, user_id, results_count)
      VALUES ($1,$2,$3,0)
      RETURNING id
      `,
      [query, searchType, userId]
    );

    const queryId = queryInsert.rows[0].id;

    let results = [];

    if (searchType === "vector") {

      results = await searchDocuments(query, {
        matchCount,
        userId
      });

    }

    else if (searchType === "keyword") {

      results = await keywordSearch(
        query,
        userId,
        matchCount
      );

    }

    else {

      results = await hybridSearch(
        query,
        userId,
        matchCount
      );

    }


    if (rerank && results.length > 0) {
      results = await rerankResults(
        results,
        query,
        matchCount
      );
    }

    results = results.filter((r) => {

      const score =
        r.combinedScore ??
        r.similarity ??
        0;

      return score > SIMILARITY_THRESHOLD;

    });

    for (let i = 0; i < results.length; i++) {

      const r = results[i];

      await db.query(
        `
        INSERT INTO search_results
        (query_id,chunk_id,document_id,score,rank_position)
        VALUES ($1,$2,$3,$4,$5)
        `,
        [
          queryId,
          r.id,
          r.documentId,
          r.combinedScore ?? r.similarity,
          i + 1
        ]
      );

    }

    await db.query(
      `
      UPDATE search_queries
      SET results_count = $1
      WHERE id = $2
      `,
      [results.length, queryId]
    );

    return NextResponse.json({
      query,
      results,
      totalResults: results.length,
      queryId
    });

  } catch (error) {

    console.error("Search error:", error);

    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );

  }
}


export async function PATCH(request: NextRequest) {
  try {

    const body = await request.json();

    const { queryId, chunkId, rankPosition } = body;

    if (!queryId || !chunkId) {
      return NextResponse.json(
        { error: "Missing queryId or chunkId" },
        { status: 400 }
      );
    }

    await trackClick(queryId, chunkId, rankPosition || 1);

    return NextResponse.json({
      success: true
    });

  } catch (error) {

    console.error("Click tracking error:", error);

    return NextResponse.json(
      { error: "Failed to track click" },
      { status: 500 }
    );

  }
}