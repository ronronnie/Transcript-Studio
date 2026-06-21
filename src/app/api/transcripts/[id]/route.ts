import { NextResponse } from "next/server";

import { deleteTranscript, getTranscript } from "@/lib/db";
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

/** Delete a transcript (cascades to its messages). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = await deleteTranscript(id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
