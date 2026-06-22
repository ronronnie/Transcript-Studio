import "server-only";

import {
  describeDiarization,
  formatTranscriptText,
  getTranscription,
} from "@/lib/assemblyai";
import { type Transcript, updateTranscript } from "@/lib/db";
import { recordUploadSeconds } from "@/lib/usage";

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
    // --- Diarization diagnostics (item 1 & 4) ---
    const diag = describeDiarization(job);
    console.log(
      `[assemblyai] transcript ${row.assemblyaiId} completed:`,
      JSON.stringify({
        language: diag.languageCode,
        audio_duration: job.audio_duration,
        utteranceCount: diag.utteranceCount,
        distinctSpeakers: diag.distinctSpeakers,
        speakers: diag.speakers,
        utterances: (job.utterances ?? []).map((u) => ({
          speaker: u.speaker,
          start: u.start,
          text: u.text.slice(0, 80),
        })),
      })
    );
    if (diag.utteranceCount === 0) {
      console.warn(
        `[assemblyai] transcript ${row.assemblyaiId}: NO utterances returned — diarization may be unsupported for language "${diag.languageCode}". Falling back to plain text. (parsing vs audio: this is a response-level issue.)`
      );
    } else if (diag.distinctSpeakers <= 1) {
      console.warn(
        `[assemblyai] transcript ${row.assemblyaiId}: only ${diag.distinctSpeakers} speaker detected across ${diag.utteranceCount} utterances. If the audio clearly has 2+ voices, this points to an AUDIO-CAPTURE issue (e.g. one mixed channel / voices too similar), not a parsing bug — the builder formats exactly what AssemblyAI returned.`
      );
    }

    const updated = await updateTranscript(row.id, {
      status: "ready",
      content: formatTranscriptText(job),
      durationSeconds: job.audio_duration ?? null,
    });
    // Count the transcribed audio toward the global daily minutes cap.
    if (job.audio_duration) await recordUploadSeconds(job.audio_duration);
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
