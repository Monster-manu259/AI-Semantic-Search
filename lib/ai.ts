import OpenAI from "openai";

export const ai = new OpenAI({
  apiKey: process.env.AI_API_KEY!,
  baseURL: process.env.AI_BASE_URL || "https://api.openai.com/v1"
});