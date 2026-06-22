import { NextResponse } from "next/server";

import { deleteAllTranscripts, listTranscripts } from "@/lib/db";
import { ensureSampleTranscript } from "@/lib/sample-transcript";
import { syncTranscripts } from "@/lib/transcripts-sync";

/**
 * List all transcripts, refreshing any still-processing jobs from AssemblyAI.
 * Seeds a read-only sample transcript when the account is empty so the demo is
 * immediately usable.
 */
export async function GET() {
  await ensureSampleTranscript();
  const rows = await listTranscripts();
  const synced = await syncTranscripts(rows);
  return NextResponse.json({ transcripts: synced });
}

/** Delete all of the user's data (transcripts + their messages via cascade). */
export async function DELETE() {
  const count = await deleteAllTranscripts();
  return NextResponse.json({ ok: true, deleted: count });
}
