import { NextResponse } from "next/server";

import { buildChatPayload } from "@/lib/chat";
import { addMessage, getTranscript, listMessages } from "@/lib/db";
import { chat, type LlmMessage } from "@/lib/llm";

/**
 * Chat about a transcript. Persists the user message, builds the prompt
 * (system instruction + transcript + recent turns, trimmed to a token budget),
 * streams the model's answer back token-by-token, and persists the full answer
 * once streaming completes.
 */
export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "Chat is not configured on the server." },
      { status: 500 }
    );
  }

  let transcriptId = "";
  let message = "";
  try {
    const body = await request.json();
    if (typeof body?.transcriptId === "string")
      transcriptId = body.transcriptId;
    if (typeof body?.message === "string") message = body.message.trim();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!transcriptId || !message) {
    return NextResponse.json(
      { error: "transcriptId and message are required." },
      { status: 400 }
    );
  }

  const transcript = await getTranscript(transcriptId);
  if (!transcript) {
    return NextResponse.json(
      { error: "Transcript not found." },
      { status: 404 }
    );
  }
  if (transcript.status !== "ready" || !transcript.content) {
    return NextResponse.json(
      { error: "This transcript isn't ready to chat about yet." },
      { status: 409 }
    );
  }

  // Persist the user's message, then load the full history (which now includes
  // it) to build the prompt.
  await addMessage(transcriptId, "user", message);
  const history = await listMessages(transcriptId);
  const llmHistory: LlmMessage[] = history.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  const { system, messages, truncated } = buildChatPayload(
    transcript.content,
    llmHistory
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      try {
        for await (const token of chat({ system, messages })) {
          full += token;
          controller.enqueue(encoder.encode(token));
        }
      } catch {
        const note = "\n\n[The response was interrupted. Please try again.]";
        controller.enqueue(encoder.encode(note));
      } finally {
        // Persist the assistant's reply so history survives reloads.
        if (full.trim()) {
          await addMessage(transcriptId, "assistant", full);
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-History-Truncated": truncated ? "1" : "0",
    },
  });
}
