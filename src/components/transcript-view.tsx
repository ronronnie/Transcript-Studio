"use client";

import { useState } from "react";
import {
  CircleAlert,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TranscriptDTO } from "@/lib/transcript-types";

interface TranscriptViewProps {
  transcript: TranscriptDTO;
  onUpdated: (transcript: TranscriptDTO) => void;
  onDeleted: (id: string) => void;
}

function formatDuration(seconds: number | null): string | null {
  if (seconds == null) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Matches a leading "Label:" at the start of a line. Generic enough to match
// both "Speaker A:" and renamed labels like "Alice:".
const SPEAKER_LINE = /^([^:\n]{1,40}):\s*(.*)$/;

/** Distinct speaker/label names found at the start of transcript lines. */
function extractSpeakerLabels(content: string): string[] {
  const seen = new Set<string>();
  for (const line of content.split("\n")) {
    const match = line.match(SPEAKER_LINE);
    if (match) seen.add(match[1].trim());
  }
  return Array.from(seen);
}

/** Replace each "oldLabel:" line-prefix with "newLabel:". */
function applySpeakerRenames(
  content: string,
  renames: Record<string, string>
): string {
  return content
    .split("\n")
    .map((line) => {
      const match = line.match(SPEAKER_LINE);
      if (!match) return line;
      const label = match[1].trim();
      const next = renames[label]?.trim();
      if (!next || next === label) return line;
      return `${next}: ${match[2]}`;
    })
    .join("\n");
}

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

export function TranscriptView({
  transcript,
  onUpdated,
  onDeleted,
}: TranscriptViewProps) {
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState(transcript.title ?? "");
  const [editing, setEditing] = useState(false);
  const [contentDraft, setContentDraft] = useState(transcript.content ?? "");
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [speakersOpen, setSpeakersOpen] = useState(false);
  const [speakerDraft, setSpeakerDraft] = useState<Record<string, string>>({});

  const duration = formatDuration(transcript.durationSeconds);
  const readOnly = transcript.isSample;
  const speakerLabels = transcript.content
    ? extractSpeakerLabels(transcript.content)
    : [];

  function openSpeakers() {
    const labels = transcript.content
      ? extractSpeakerLabels(transcript.content)
      : [];
    setSpeakerDraft(Object.fromEntries(labels.map((l) => [l, l])));
    setSpeakersOpen(true);
  }

  async function saveSpeakers() {
    if (!transcript.content) return;
    const next = applySpeakerRenames(transcript.content, speakerDraft);
    if (next === transcript.content) {
      setSpeakersOpen(false);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/transcripts/${transcript.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Could not rename speakers.");
        return;
      }
      onUpdated(data.transcript as TranscriptDTO);
      setSpeakersOpen(false);
      toast.success("Speakers renamed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveTitle() {
    const next = titleDraft.trim();
    setBusy(true);
    try {
      const res = await fetch(`/api/transcripts/${transcript.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Could not rename.");
        return;
      }
      onUpdated(data.transcript as TranscriptDTO);
      setRenaming(false);
      toast.success("Renamed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveContent() {
    setBusy(true);
    try {
      const res = await fetch(`/api/transcripts/${transcript.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: contentDraft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Could not save changes.");
        return;
      }
      onUpdated(data.transcript as TranscriptDTO);
      setEditing(false);
      toast.success("Transcript updated.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch(`/api/transcripts/${transcript.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Could not delete.");
        return;
      }
      onDeleted(transcript.id);
      toast.success("Transcript deleted.");
    } finally {
      setBusy(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col p-6 md:p-10">
      <header className="border-b pb-4">
        <div className="flex items-start justify-between gap-2">
          {renaming ? (
            <div className="flex flex-1 items-center gap-2">
              <Input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle();
                  if (e.key === "Escape") setRenaming(false);
                }}
              />
              <Button size="sm" onClick={saveTitle} disabled={busy}>
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRenaming(false)}
                disabled={busy}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {transcript.title ?? "Untitled transcript"}
              </h1>
              {transcript.status === "processing" && (
                <Badge variant="secondary">
                  <Spinner className="size-3" />
                  Processing
                </Badge>
              )}
              {transcript.status === "error" && (
                <Badge variant="destructive">
                  <CircleAlert className="size-3" />
                  Error
                </Badge>
              )}
              {readOnly && <Badge variant="outline">Sample · read-only</Badge>}
            </div>
          )}

          {!readOnly && !renaming && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" size="icon-sm" aria-label="Actions" />
                }
              >
                <MoreVertical className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setTitleDraft(transcript.title ?? "");
                    setRenaming(true);
                  }}
                >
                  <Pencil className="size-4" />
                  Rename
                </DropdownMenuItem>
                {transcript.status === "ready" && (
                  <DropdownMenuItem
                    onClick={() => {
                      setContentDraft(transcript.content ?? "");
                      setEditing(true);
                    }}
                  >
                    <Pencil className="size-4" />
                    Edit transcript
                  </DropdownMenuItem>
                )}
                {transcript.status === "ready" && speakerLabels.length > 0 && (
                  <DropdownMenuItem onClick={openSpeakers}>
                    <Users className="size-4" />
                    Rename speakers
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setConfirmOpen(true)}
                >
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
            <Spinner className="size-4" />
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
          (editing ? (
            <div className="flex flex-col gap-3">
              <Textarea
                value={contentDraft}
                onChange={(e) => setContentDraft(e.target.value)}
                rows={16}
                className="font-mono text-sm"
              />
              <div className="flex gap-2">
                <Button onClick={saveContent} disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  Save changes
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setEditing(false)}
                  disabled={busy}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : transcript.content ? (
            <TranscriptBody content={transcript.content} />
          ) : (
            <p className="text-muted-foreground text-sm">
              This transcript is empty.
            </p>
          ))}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this transcript?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the transcript and its chat history. This
              can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                remove();
              }}
              disabled={busy}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={speakersOpen} onOpenChange={setSpeakersOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename speakers</DialogTitle>
            <DialogDescription>
              Give each detected speaker a real name. Changes are saved to the
              transcript.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {Object.keys(speakerDraft).map((label) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-muted-foreground w-28 shrink-0 truncate text-sm">
                  {label}
                </span>
                <Label htmlFor={`spk-${label}`} className="sr-only">
                  {label}
                </Label>
                <Input
                  id={`spk-${label}`}
                  value={speakerDraft[label]}
                  onChange={(e) =>
                    setSpeakerDraft((prev) => ({
                      ...prev,
                      [label]: e.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setSpeakersOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button onClick={saveSpeakers} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />}
              Save names
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
