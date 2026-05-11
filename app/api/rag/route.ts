import { NextRequest, NextResponse } from "next/server";
import {
  generateRAGResponse,
  answerFollowUp,
  generateSummary,
} from "@/lib/rag";
import { SearchResult } from "@/lib/search";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      query,
      maxContextLength,
      temperature,
      includeSourceReferences = true,
      isFollowUp = false,
      originalQuery,
      previousContext,
    } = body;

    if (!query) {
      return NextResponse.json(
        { error: "Missing query parameter" },
        { status: 400 }
      );
    }

    let response;

    if (isFollowUp && originalQuery && previousContext) {
      response = await answerFollowUp(
        originalQuery,
        query,
        previousContext as SearchResult[],
        {
          maxContextLength,
          temperature,
          includeSourceReferences,
        }
      );
    } else {
      response = await generateRAGResponse(query, {
        maxContextLength,
        temperature,
        includeSourceReferences,
      });
    }

    return NextResponse.json({
      query,
      answer: response?.answer ?? "No answer generated",
      sources: response?.sources ?? [],
      confidence: response?.confidence ?? 0,
      sourceCount: response?.sources.length ?? 0,
    });
  } catch (error) {
    console.error("RAG error:", error);

  return NextResponse.json(
  {
    answer: "Failed to generate response.",
    sources: [],
    confidence: 0,
  },
  { status: 500 }
);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const documentId = searchParams.get("documentId");
    const action = searchParams.get("action");

    if (action === "summary" && documentId) {
      const summary = await generateSummary(documentId);

      return NextResponse.json({
        documentId,
        summary,
      });
    }

    return NextResponse.json(
      { error: "Invalid action or missing parameters" },
      { status: 400 }
    );
  } catch (error) {
    console.error("RAG GET error:", error);

    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}