import { NextResponse } from "next/server";

import { listTranscripts } from "@/lib/db";
import { syncTranscripts } from "@/lib/transcripts-sync";

/** List all transcripts, refreshing any still-processing jobs from AssemblyAI. */
export async function GET() {
  const rows = await listTranscripts();
  const synced = await syncTranscripts(rows);
  return NextResponse.json({ transcripts: synced });
}
