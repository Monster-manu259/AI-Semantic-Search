import { pinecone } from "./pinecone";

export async function generateEmbedding(text: string) {
  const res = await pinecone.inference.embed({
    model: "llama-text-embed-v2",
    inputs: [text],
    parameters: {
      input_type: "passage",
    },
  } as any);

  const embedding = res.data[0] as { values: number[] };

  return embedding.values;
}