import "server-only";

/**
 * Minimal AssemblyAI (batch) client.
 *
 * The API key (ASSEMBLYAI_API_KEY) is read here on the server only and never
 * leaves it. We upload audio bytes, start a transcription job (automatic
 * language detection + speaker labels), and poll for completion. We do NOT
 * persist the raw audio — the caller hands us the bytes, we forward them to
 * AssemblyAI, and the buffer is discarded after the request.
 */

const API_BASE = "https://api.assemblyai.com/v2";

function apiKey(): string {
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) {
    throw new Error("ASSEMBLYAI_API_KEY is not set.");
  }
  return key;
}

/** AssemblyAI job statuses. */
export type AssemblyStatus = "queued" | "processing" | "completed" | "error";

interface AssemblyUtterance {
  speaker: string;
  text: string;
  start: number; // ms from start of audio
  end: number;
}

interface AssemblyTranscript {
  id: string;
  status: AssemblyStatus;
  text: string | null;
  utterances: AssemblyUtterance[] | null;
  audio_duration: number | null;
  language_code: string | null;
  error: string | null;
}

export interface StartTranscriptionOptions {
  /** Optional hint for how many distinct speakers to expect. */
  speakersExpected?: number;
}

/**
 * Upload raw audio bytes to AssemblyAI's temporary storage.
 * Returns an upload URL usable as `audio_url` when creating a job.
 */
export async function uploadAudio(bytes: ArrayBuffer): Promise<string> {
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    headers: {
      authorization: apiKey(),
      "content-type": "application/octet-stream",
    },
    body: bytes,
  });

  if (!res.ok) {
    throw new Error(
      `AssemblyAI upload failed (${res.status}): ${await res.text()}`
    );
  }

  const data = (await res.json()) as { upload_url: string };
  return data.upload_url;
}

/**
 * Start a transcription job with automatic language detection and speaker
 * diarization. Returns the AssemblyAI transcript id.
 *
 * Speaker labels (diarization) require `speaker_labels: true` and must NOT be
 * combined with `multichannel` — the two are mutually exclusive, so we
 * deliberately never set multichannel here.
 */
export async function startTranscription(
  audioUrl: string,
  options: StartTranscriptionOptions = {}
): Promise<string> {
  const payload: Record<string, unknown> = {
    audio_url: audioUrl,
    speaker_labels: true,
    language_detection: true,
    // NOTE: do not set `multichannel` — it conflicts with speaker_labels.
  };
  if (
    typeof options.speakersExpected === "number" &&
    options.speakersExpected >= 1
  ) {
    payload.speakers_expected = Math.round(options.speakersExpected);
  }

  const res = await fetch(`${API_BASE}/transcript`, {
    method: "POST",
    headers: {
      authorization: apiKey(),
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(
      `AssemblyAI job creation failed (${res.status}): ${await res.text()}`
    );
  }

  const data = (await res.json()) as { id: string };
  return data.id;
}

/** Fetch the current state of a transcription job. */
export async function getTranscription(
  id: string
): Promise<AssemblyTranscript> {
  const res = await fetch(`${API_BASE}/transcript/${id}`, {
    headers: { authorization: apiKey() },
    // Always hit the API, never a cached response.
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(
      `AssemblyAI fetch failed (${res.status}): ${await res.text()}`
    );
  }

  return (await res.json()) as AssemblyTranscript;
}

/**
 * Format a completed transcript into readable text.
 *
 * Always builds from `utterances` (the diarized, per-speaker segments), one
 * line per utterance as "Speaker A: <text>", ordered by start time. Only falls
 * back to the plain `transcript.text` blob when there are no utterances at all
 * (e.g. diarization unsupported for the detected language).
 */
export function formatTranscriptText(job: AssemblyTranscript): string {
  if (job.utterances && job.utterances.length > 0) {
    return [...job.utterances]
      .sort((a, b) => a.start - b.start)
      .map((u) => `Speaker ${u.speaker}: ${u.text}`)
      .join("\n\n");
  }
  return job.text ?? "";
}

/** Diarization summary for logging/diagnostics. */
export interface DiarizationInfo {
  utteranceCount: number;
  distinctSpeakers: number;
  speakers: string[];
  languageCode: string | null;
}

export function describeDiarization(job: AssemblyTranscript): DiarizationInfo {
  const utterances = job.utterances ?? [];
  const speakers = Array.from(new Set(utterances.map((u) => u.speaker))).sort();
  return {
    utteranceCount: utterances.length,
    distinctSpeakers: speakers.length,
    speakers,
    languageCode: job.language_code,
  };
}
