"use client";

import { FileText, Mic, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

interface NewChooserProps {
  onTranscript: () => void;
  onAudio: () => void;
  onRecord: () => void;
  /** When provided, shows a Cancel action (omit for the default landing). */
  onCancel?: () => void;
}

const OPTIONS = [
  {
    key: "transcript",
    title: "Transcript",
    description: "Paste existing transcript text.",
    icon: FileText,
  },
  {
    key: "audio",
    title: "Audio File",
    description: "Upload an mp3, m4a, or wav file.",
    icon: Upload,
  },
  {
    key: "record",
    title: "Record",
    description: "Record from your microphone.",
    icon: Mic,
  },
] as const;

export function NewChooser({
  onTranscript,
  onAudio,
  onRecord,
  onCancel,
}: NewChooserProps) {
  const handlers = {
    transcript: onTranscript,
    audio: onAudio,
    record: onRecord,
  } as const;

  return (
    <div className="relative flex flex-1 items-center justify-center p-6">
      <div className="brand-glow pointer-events-none absolute inset-0" />
      <div className="relative w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-brand-gradient text-2xl font-semibold tracking-tight">
            Add a transcript
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Choose how you&apos;d like to get started.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.key}
                type="button"
                onClick={handlers[option.key]}
                className="bg-card hover:ring-brand/50 group ring-foreground/10 flex flex-col items-center gap-3 rounded-xl p-6 text-center ring-1 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="bg-brand-gradient flex size-12 items-center justify-center rounded-xl text-white shadow-md transition-transform group-hover:scale-105">
                  <Icon className="size-6" />
                </div>
                <div>
                  <p className="font-medium">{option.title}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {option.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {onCancel && (
          <div className="mt-6 text-center">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
