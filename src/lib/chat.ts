import "server-only";

import type { LlmMessage } from "@/lib/llm";

/**
 * Build the LLM request for a transcript chat turn.
 *
 * The prompt is: a system instruction + the full transcript + recent chat
 * turns + the new question (the last item in `history`). No RAG yet — the whole
 * transcript goes into context. If the transcript + history would exceed a safe
 * token budget, we keep the transcript and drop the oldest history turns,
 * reporting `truncated` so the UI can show a notice.
 */

const SYSTEM_INSTRUCTION = `You are an assistant that answers questions about a single meeting transcript.
- Be concise.
- Cite speaker names (e.g. "Speaker A") when relevant.
- If the answer is not in the transcript, say so plainly rather than guessing.`;

// gpt-4o-mini has a 128k context window. Stay well under it and reserve room
// for the response. Token counts are estimated (~4 chars/token) — good enough
// for deciding when to trim history.
const INPUT_TOKEN_BUDGET = 110_000;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface ChatPayload {
  system: string;
  messages: LlmMessage[];
  truncated: boolean;
}

export function buildChatPayload(
  transcriptText: string,
  history: LlmMessage[]
): ChatPayload {
  const system = `${SYSTEM_INSTRUCTION}\n\nTranscript:\n"""\n${transcriptText}\n"""`;

  let remaining = INPUT_TOKEN_BUDGET - estimateTokens(system);

  // Keep newest turns first; always keep the last turn (the new question),
  // even if it alone exceeds the remaining budget.
  const kept: LlmMessage[] = [];
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    const cost = estimateTokens(msg.content);
    if (kept.length > 0 && cost > remaining) break;
    kept.push(msg);
    remaining -= cost;
  }
  kept.reverse();

  return {
    system,
    messages: kept,
    truncated: kept.length < history.length,
  };
}
