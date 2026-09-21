import { ChatGroq } from "@langchain/groq";

// temperature: 0 — this model only ever ranks a fixed candidate list against
// forced structured output (see ai-search.service.js), never generates free
// creative text, so there's no reason to want variation between calls for
// the same input.
export const groqModel = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "openai/gpt-oss-120b",
  temperature: 0,
});
