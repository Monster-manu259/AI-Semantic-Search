import { db } from "./db";
import { searchDocuments, SearchResult } from "./search";
import { generateCompletion } from "./completion";

export interface RAGResponse {
    answer: string;
    sources: SearchResult[];
    confidence: number;
}

export interface RAGOptions {
    maxContextLength?: number;
    temperature?: number;
    includeSourceReferences?: boolean;
}

export async function generateRAGResponse(
    query: string,
    options: RAGOptions = {}
): Promise<RAGResponse> {
    const {
        maxContextLength = 3000,
        temperature = 0.7,
        includeSourceReferences = true
    } = options;

    const searchResults = await searchDocuments(query);

    if (!searchResults.length) {
        return {
        answer: "I could not find any relevant information to answer your question.",
            sources: [],
            confidence: 0
        };

    }

    const context = buildContext(searchResults, maxContextLength);

    const systemPrompt = `
You are a helpful AI assistant.
Answer the user's question ONLY using the provided context.
If the context is insufficient, say that clearly.
Always reference the sources when possible.
`;

    const userPrompt = `
Context:
${context}
Question:
${query}
${includeSourceReferences ? "Include references to the sources used." : ""}

`;
    const answer = await generateCompletion(userPrompt, systemPrompt, temperature);

    const confidence = calculateConfidence(searchResults, query);

    return {
    answer,
        sources: searchResults,
        confidence
    };
}

function buildContext(results: SearchResult[], maxLength: number): string {

    let context = "";
    const seen = new Set<string>();

    for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (seen.has(r.content)) continue;
        const title = r.documentTitle || "Document";
        const text = `[Source ${i + 1}: ${title}]
${r.content}
`;

if (context.length + text.length > maxLength) break;
        context += text;
        seen.add(r.content);
    }
    return context;
}


function calculateConfidence(results: SearchResult[], query: string): number {

    if (!results.length) return 0;

    const avgSimilarity =
        results.reduce((sum, r) => sum + (r.similarity ?? 0), 0) /
        results.length;

    const queryWords = query.toLowerCase().split(/\s+/);

    const top = results[0];
    const matchingWords = queryWords.filter(word =>
        top.content.toLowerCase().includes(word)
    );

    const keywordMatch = matchingWords.length / queryWords.length;

    const diversity = results.length >= 3 ? 1 : results.length / 3;

    const confidence =
        avgSimilarity * 0.5 +
        keywordMatch * 0.3 +
        diversity * 0.2;

    return Math.min(confidence, 1);
}

export async function generateSummary(documentId: string): Promise<string> {

   const doc = await db.query(
       `SELECT id FROM documents WHERE id = $1`,
        [documentId]
    );

    if (!doc.rows.length) {
        throw new Error("Document not found");
    }

    const chunks = await db.query(
        `
    SELECT content
    FROM document_chunks
    WHERE document_id = $1
    ORDER BY chunk_index
    LIMIT 5
    `,
        [documentId]
    );

    if (!chunks.rows.length) {
        return "No content available to summarize.";
    }

    const content = chunks.rows.map(r => r.content).join("\n\n");

    const systemPrompt =
        "You are an AI that writes short summaries of documents.";

    const userPrompt = `
Summarize the following document:

${content}

`;
    return generateCompletion(userPrompt, systemPrompt, 0.5);
}


export async function answerFollowUp(
    originalQuery: string,
    followUpQuery: string,
    previousContext: SearchResult[],
    options: RAGOptions = {}
): Promise<RAGResponse> {

    const newResults = await searchDocuments(followUpQuery);

    const merged = [...previousContext, ...newResults]

        .filter((r, i, arr) =>

            i === arr.findIndex(x => x.id === r.id)

        )

        .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))

        .slice(0, 5);



    const context = buildContext(

        merged,

        options.maxContextLength ?? 3000

    );



    const systemPrompt = `

You are an AI assistant answering a follow-up question.

Use both the previous context and the new context.

`;

    const userPrompt = `

Original question:
${originalQuery}

Follow-up question:
${followUpQuery}

Context:
${context}
`;

    const answer = await generateCompletion(
        userPrompt,
        systemPrompt,
        options.temperature ?? 0.7
    );

    return {
        answer,
        sources: merged,
        confidence: calculateConfidence(merged, followUpQuery)
    };
}

export async function extractKeywords(text: string): Promise<string[]> {
    const systemPrompt =
        "Extract the main keywords from the text.";
    const userPrompt = `
Extract the key concepts from this text.
Return them as a comma separated list.
${text}
`;

    const response = await generateCompletion(userPrompt, systemPrompt, 0.3);
    return response
        .split(",")
        .map(k => k.trim())
        .filter(Boolean);
}