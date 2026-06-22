import { NextResponse } from "next/server";

import { deleteTranscript, getTranscript, updateTranscript } from "@/lib/db";
import { syncTranscript } from "@/lib/transcripts-sync";

/** Fetch one transcript, refreshing it from AssemblyAI if still processing. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const row = await getTranscript(id);
  if (!row) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const synced = await syncTranscript(row);
  return NextResponse.json({ transcript: synced });
}

/** Rename a transcript (title) or correct its text (content). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await getTranscript(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (existing.isSample) {
    return NextResponse.json(
      { error: "The sample transcript is read-only." },
      { status: 403 }
    );
  }

  let body: { title?: unknown; content?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const patch: { title?: string | null; content?: string | null } = {};
  if (typeof body.title === "string") {
    const t = body.title.trim();
    patch.title = t ? t : null;
  }
  if (typeof body.content === "string") {
    patch.content = body.content;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const updated = await updateTranscript(id, patch);
  return NextResponse.json({ transcript: updated });
}

/** Delete a transcript (cascades to its messages). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = await getTranscript(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (existing.isSample) {
    return NextResponse.json(
      { error: "The sample transcript can't be deleted." },
      { status: 403 }
    );
  }

  await deleteTranscript(id);
  return NextResponse.json({ ok: true });
}
