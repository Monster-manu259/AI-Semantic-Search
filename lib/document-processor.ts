import { randomUUID } from "crypto";
import { index } from "./pinecone";
import { db } from "./db";
import { generateEmbedding } from "./embeddings";
import { chunkText } from "./chunking";


export async function storeChunk(
  documentId: string,
  chunkText: string,
  chunkIndex: number
) {
  try {
    const embedding = await generateEmbedding(chunkText);

    const vectorId = randomUUID();

    await index.upsert({
      records: [
        {
          id: vectorId,
          values: embedding,
          metadata: {
            documentId,
            chunkIndex,
          },
        },
      ],
    });

    await db.query(
      `
      INSERT INTO document_chunks
      (document_id, chunk_index, content, pinecone_id)
      VALUES ($1,$2,$3,$4)
      `,
      [documentId, chunkIndex, chunkText, vectorId]
    );

    console.log("Processing chunk:", chunkIndex);
console.log("Embedding size:", embedding.length);

    return {
      success: true,
      vectorId,
    };
  } catch (error) {
    console.error("Chunk storage failed:", error);
    throw new Error("Failed to store document chunk");
  }
}


export async function processDocument(documentId: string) {
  try {
    const result = await db.query(
      `SELECT * FROM documents WHERE id = $1`,
      [documentId]
    );

    const document = result.rows[0];

    if (!document) {
      throw new Error("Document not found");
    }

    const chunks = chunkText(document.content);

    for (const chunk of chunks) {
      await storeChunk(documentId, chunk.content, chunk.index);
    }

    await db.query(
      `
      UPDATE documents
      SET status = 'indexed'
      WHERE id = $1
      `,
      [documentId]
    );

    return {
      success: true,
      chunks: chunks.length,
    };
  } catch (error) {
    console.error("Document processing failed:", error);

    await db.query(
      `
      UPDATE documents
      SET status = 'failed'
      WHERE id = $1
      `,
      [documentId]
    );

    throw error;
  }
}


export async function getDocumentWithChunks(documentId: string) {
  const docResult = await db.query(
    `SELECT * FROM documents WHERE id = $1`,
    [documentId]
  );

  const document = docResult.rows[0];

  const chunkResult = await db.query(
    `
    SELECT *
    FROM document_chunks
    WHERE document_id = $1
    ORDER BY chunk_index
    `,
    [documentId]
  );

  return {
    document,
    chunks: chunkResult.rows,
  };
}

/*
----------------------------------------
DELETE DOCUMENT
----------------------------------------
*/

export async function deleteDocument(documentId: string) {
  const chunks = await db.query(
    `
    SELECT pinecone_id
    FROM document_chunks
    WHERE document_id = $1
    `,
    [documentId]
  );

  const vectorIds = chunks.rows.map((c) => c.pinecone_id);

  if (vectorIds.length > 0) {
    await index.deleteMany({ ids: vectorIds });
  }

  await db.query(`DELETE FROM documents WHERE id = $1`, [documentId]);

  return {
    success: true,
  };
}

/*
----------------------------------------
REPROCESS DOCUMENT
----------------------------------------
*/

export async function reprocessDocument(documentId: string) {

  const result = await db.query(
    `SELECT * FROM documents WHERE id = $1`,
    [documentId]
  );

  const document = result.rows[0];

  if (!document) {
    throw new Error("Document not found");
  }

  const chunks = await db.query(
    `SELECT pinecone_id FROM document_chunks WHERE document_id = $1`,
    [documentId]
  );

  const vectorIds = chunks.rows.map((c) => c.pinecone_id);

  if (vectorIds.length > 0) {
    await index.deleteMany(vectorIds);
  }

  await db.query(
    `DELETE FROM document_chunks WHERE document_id = $1`,
    [documentId]
  );

  await db.query(
    `UPDATE documents SET status = 'processing' WHERE id = $1`,
    [documentId]
  );

  return processDocument(documentId);
}