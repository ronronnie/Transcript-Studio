import { NextResponse } from "next/server";

import { startTranscription, uploadAudio } from "@/lib/assemblyai";
import { createTranscript } from "@/lib/db";

// Accept common audio container types. We check by MIME and extension since
// browsers report m4a/wav inconsistently.
const ALLOWED_EXTENSIONS = ["mp3", "m4a", "wav"];
const MAX_BYTES = 100 * 1024 * 1024; // 100 MB

function hasAllowedExtension(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase();
  return !!ext && ALLOWED_EXTENSIONS.includes(ext);
}

/**
 * Receive an audio file, forward it to AssemblyAI, and create a 'processing'
 * transcript row holding the AssemblyAI job id. The raw audio is never stored
 * on our side — the buffer lives only for the duration of this request.
 */
export async function POST(request: Request) {
  if (!process.env.ASSEMBLYAI_API_KEY) {
    return NextResponse.json(
      { error: "Transcription is not configured on the server." },
      { status: 500 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart form data." },
      { status: 400 }
    );
  }

  const file = form.get("file");
  const rawTitle = form.get("title");
  const title =
    typeof rawTitle === "string" && rawTitle.trim() ? rawTitle.trim() : null;

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "Please choose an audio file." },
      { status: 400 }
    );
  }

  if (!hasAllowedExtension(file.name)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use mp3, m4a, or wav." },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File is too large (max 100 MB)." },
      { status: 413 }
    );
  }

  try {
    // Read bytes, forward to AssemblyAI, then let the buffer go out of scope.
    const bytes = await file.arrayBuffer();
    const uploadUrl = await uploadAudio(bytes);
    const assemblyaiId = await startTranscription(uploadUrl);

    const transcript = await createTranscript({
      source: "upload",
      title: title ?? file.name,
      status: "processing",
      assemblyaiId,
    });

    return NextResponse.json({ transcript }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start transcription.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
