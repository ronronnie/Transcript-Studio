"use client";

import { useState } from "react";
import {
  CircleAlert,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const duration = formatDuration(transcript.durationSeconds);
  const readOnly = transcript.isSample;

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
    </div>
  );
}
