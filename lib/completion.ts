import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
});

export async function generateCompletion(
  userPrompt: string,
  systemPrompt: string = "You are a helpful AI assistant.",
  temperature: number = 0.3
) {
  const res = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature,
  });

  return res.choices?.[0]?.message?.content ?? "No response generated.";
}