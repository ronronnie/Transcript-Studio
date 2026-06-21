import "server-only";

import OpenAI from "openai";

/**
 * Small provider-agnostic LLM interface.
 *
 * Everything in the app talks to `chat()` — a streaming chat call — rather than
 * to OpenAI directly, so the provider can be swapped later by replacing the
 * implementation below. The model is read from LLM_MODEL with a sensible
 * default.
 */

export interface LlmMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatParams {
  /** System instruction (includes the transcript context). */
  system: string;
  /** Conversation turns, oldest first; the last one is the new question. */
  messages: LlmMessage[];
}

export const DEFAULT_MODEL = "gpt-4o-mini";

export function llmModel(): string {
  return process.env.LLM_MODEL?.trim() || DEFAULT_MODEL;
}

let client: OpenAI | null = null;

function openai(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set.");
  }
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

/**
 * Stream a chat completion as an async iterable of text deltas (tokens).
 * Default implementation: OpenAI Chat Completions (gpt-4o-mini by default).
 */
export async function* chat(params: ChatParams): AsyncIterable<string> {
  const stream = await openai().chat.completions.create({
    model: llmModel(),
    stream: true,
    messages: [{ role: "system", content: params.system }, ...params.messages],
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}
