import { generateEmbedding } from "./embeddings"
import { index } from "./pinecone"
import { db } from "./db"

export interface SearchResult {
  id: string
  documentId: string
  content: string
  similarity: number
  keywordScore?: number
  combinedScore?: number
  documentTitle?: string
}

const SIMILARITY_THRESHOLD = 0.15

/*
--------------------------------------------------
VECTOR SEARCH
--------------------------------------------------
*/

export async function searchDocuments(
  query: string,
  options?: {
    matchCount?: number
    userId?: string
  }
): Promise<SearchResult[]> {

  const matchCount = options?.matchCount ?? 10
  const userId = options?.userId ?? null

  const embedding = await generateEmbedding(query)

  const pineconeResult = await index.query({
    vector: embedding,
    topK: matchCount * 10,
    includeMetadata: true
  })

  if (!pineconeResult.matches?.length) return []

  const vectorIds = pineconeResult.matches.map(m => m.id)

  const scoreMap = new Map(
    pineconeResult.matches.map(m => [m.id, m.score])
  )

  const result = await db.query(
    `
    SELECT
      dc.id,
      dc.document_id,
      dc.content,
      dc.pinecone_id,
      d.title AS document_title,
      u.role AS owner_role
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    JOIN users u ON d.user_id = u.id
    WHERE dc.pinecone_id = ANY($1::text[])
      AND (d.user_id = $2 OR u.role = 'admin')
    `,
    [vectorIds, userId]
  )

  const queryWords = query.toLowerCase().split(/\s+/)

  const formatted: SearchResult[] = result.rows.map(row => {

    const similarity = scoreMap.get(row.pinecone_id) || 0
    const text = row.content.toLowerCase()

    const keywordMatches = queryWords.filter(w => text.includes(w)).length

    const keywordScore = keywordMatches / queryWords.length

    const combinedScore =
      similarity * 0.9 +
      keywordScore * 0.1

    return {
      id: row.id,
      documentId: row.document_id,
      content: row.content,
      documentTitle: row.document_title,
      similarity,
      keywordScore,
      combinedScore
    }
  })

  const filtered = formatted.filter(
    r => (r.combinedScore ?? 0) > SIMILARITY_THRESHOLD
  )

  filtered.sort(
    (a, b) => (b.combinedScore ?? 0) - (a.combinedScore ?? 0)
  )

  return filtered.slice(0, matchCount)
}


export async function keywordSearch(
  query: string,
  userId: string,
  limit = 10
): Promise<SearchResult[]> {

  const result = await db.query(
    `
    SELECT
      dc.id,
      dc.document_id,
      dc.content,
      d.title AS document_title,
      ts_rank(dc.content_tsv, plainto_tsquery('english',$1)) AS score
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    JOIN users u ON d.user_id = u.id
    WHERE dc.content_tsv @@ plainto_tsquery('english',$1)
      AND (d.user_id = $2 OR u.role = 'admin')
    ORDER BY score DESC
    LIMIT $3
    `,
    [query, userId, limit]
  )

  return result.rows.map((row: any) => ({
    id: row.id,
    documentId: row.document_id,
    content: row.content,
    documentTitle: row.document_title,
    similarity: row.score,
    combinedScore: row.score
  }))
}


export async function hybridSearch(
  query: string,
  userId: string,
  limit = 10
): Promise<SearchResult[]> {

  const vectorResults = await searchDocuments(query, {
    matchCount: limit,
    userId
  })

  const keywordResults = await keywordSearch(query, userId, limit)

  const merged = new Map<string, SearchResult>()

  for (const r of vectorResults) {
    merged.set(r.id, r)
  }

  for (const r of keywordResults) {

    if (merged.has(r.id)) {

      const existing = merged.get(r.id)!

      existing.combinedScore =
        (existing.combinedScore ?? existing.similarity) +
        (r.similarity ?? 0)

    } else {

      merged.set(r.id, r)

    }
  }

  return Array.from(merged.values())
    .sort((a, b) => (b.combinedScore ?? 0) - (a.combinedScore ?? 0))
    .slice(0, limit)
}


export async function rerankResults(
  results: SearchResult[],
  query: string,
  limit = 10
): Promise<SearchResult[]> {

  if (!results.length) return []

  const queryWords = query.toLowerCase().split(/\s+/)

  const rescored = results.map(r => {

    const text = r.content.toLowerCase()

    const keywordBoost = queryWords.reduce((acc, word) => {
      return acc + (text.includes(word) ? 0.02 : 0)
    }, 0)

    return {
      ...r,
      combinedScore:
        (r.combinedScore ?? r.similarity) +
        keywordBoost
    }
  })

  rescored.sort(
    (a, b) => (b.combinedScore ?? 0) - (a.combinedScore ?? 0)
  )

  return rescored.slice(0, limit)
}



export async function trackClick(
  queryId: string,
  chunkId: string,
  rankPosition: number
) {

  await db.query(
    `
    INSERT INTO search_analytics
    (query_id, chunk_id, rank_position, clicked)
    VALUES ($1,$2,$3,true)
    `,
    [queryId, chunkId, rankPosition]
  )
}



export async function getSearchAnalytics(
  userId: string,
  limit = 50
) {

  const result = await db.query(
    `
    SELECT *
    FROM search_queries
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2
    `,
    [userId, limit]
  )

  return result.rows
}