import "server-only";

import { formatTranscriptText, getTranscription } from "@/lib/assemblyai";
import { type Transcript, updateTranscript } from "@/lib/db";

/**
 * Reconcile a single transcript row with its AssemblyAI job.
 *
 * Polling is driven by our own API: whenever a 'processing' row is read (list
 * or detail), we check AssemblyAI and persist the result. On completion we save
 * the speaker-labelled text + duration and set status 'ready'; on failure we
 * store the error message and set status 'error'. Transient fetch errors leave
 * the row 'processing' so the next poll retries.
 */
export async function syncTranscript(row: Transcript): Promise<Transcript> {
  if (row.status !== "processing" || !row.assemblyaiId) {
    return row;
  }

  let job;
  try {
    job = await getTranscription(row.assemblyaiId);
  } catch {
    // Transient error — leave as processing and retry on the next poll.
    return row;
  }

  if (job.status === "completed") {
    const updated = await updateTranscript(row.id, {
      status: "ready",
      content: formatTranscriptText(job),
      durationSeconds: job.audio_duration ?? null,
    });
    return updated ?? row;
  }

  if (job.status === "error") {
    const updated = await updateTranscript(row.id, {
      status: "error",
      content: job.error ?? "Transcription failed.",
    });
    return updated ?? row;
  }

  // queued / processing — no change yet.
  return row;
}

/** Reconcile many rows in parallel (used by the list endpoint). */
export async function syncTranscripts(
  rows: Transcript[]
): Promise<Transcript[]> {
  return Promise.all(rows.map(syncTranscript));
}
