"use client";

import { CircleAlert, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { TranscriptDTO } from "@/lib/transcript-types";

function formatDuration(seconds: number | null): string | null {
  if (seconds == null) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const SPEAKER_LINE = /^(Speaker [^:]+):\s*(.*)$/;

function TranscriptBody({ content }: { content: string }) {
  const lines = content.split("\n").filter((line) => line.trim().length > 0);

  return (
    <div className="flex flex-col gap-4 text-sm leading-relaxed">
      {lines.map((line, i) => {
        const match = line.match(SPEAKER_LINE);
        if (match) {
          return (
            <p key={i}>
              <span className="text-foreground font-semibold">{match[1]}</span>
              <span className="text-muted-foreground">: {match[2]}</span>
            </p>
          );
        }
        return (
          <p key={i} className="text-foreground/90">
            {line}
          </p>
        );
      })}
    </div>
  );
}

export function TranscriptView({ transcript }: { transcript: TranscriptDTO }) {
  const duration = formatDuration(transcript.durationSeconds);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col p-6 md:p-10">
      <header className="border-b pb-4">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            {transcript.title ?? "Untitled transcript"}
          </h1>
          {transcript.status === "processing" && (
            <Badge variant="secondary">
              <Loader2 className="size-3 animate-spin" />
              Processing
            </Badge>
          )}
          {transcript.status === "error" && (
            <Badge variant="destructive">
              <CircleAlert className="size-3" />
              Error
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-1 text-xs">
          {transcript.source === "upload"
            ? "Uploaded audio"
            : transcript.source === "recording"
              ? "Recording"
              : "Pasted text"}
          {duration ? ` · ${duration}` : ""}
        </p>
      </header>

      <div className="pt-6">
        {transcript.status === "processing" && (
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Transcribing your audio… this can take a little while.
          </div>
        )}

        {transcript.status === "error" && (
          <div className="text-destructive bg-destructive/10 flex items-start gap-2 rounded-md p-4 text-sm">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              {transcript.content ?? "Transcription failed. Please try again."}
            </span>
          </div>
        )}

        {transcript.status === "ready" &&
          (transcript.content ? (
            <TranscriptBody content={transcript.content} />
          ) : (
            <p className="text-muted-foreground text-sm">
              This transcript is empty.
            </p>
          ))}
      </div>
    </div>
  );
}
