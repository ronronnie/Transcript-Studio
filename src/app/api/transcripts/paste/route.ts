import { NextResponse } from "next/server";

import { createTranscript } from "@/lib/db";

/**
 * Create a transcript from already-existing text. No transcription needed, so
 * the row is created with status 'ready' immediately.
 */
export async function POST(request: Request) {
  let body: { title?: unknown; content?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const content = typeof body.content === "string" ? body.content.trim() : "";
  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : null;

  if (!content) {
    return NextResponse.json(
      { error: "Please paste some transcript text." },
      { status: 400 }
    );
  }

  const transcript = await createTranscript({
    source: "pasted",
    title: title ?? "Pasted transcript",
    status: "ready",
    content,
  });

  return NextResponse.json({ transcript }, { status: 201 });
}
