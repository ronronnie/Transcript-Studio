"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { TranscriptDTO } from "@/lib/transcript-types";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (transcript: TranscriptDTO) => void;
}

export function ImportDialog({
  open,
  onOpenChange,
  onCreated,
}: ImportDialogProps) {
  // Upload tab
  const [file, setFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Paste tab
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteContent, setPasteContent] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setFile(null);
    setUploadTitle("");
    setUploadError(null);
    setPasteTitle("");
    setPasteContent("");
    setPasteError(null);
    setSubmitting(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function submitUpload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) {
      setUploadError("Please choose an audio file.");
      return;
    }
    setUploadError(null);
    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("file", file);
      if (uploadTitle.trim()) body.append("title", uploadTitle.trim());

      const res = await fetch("/api/transcripts/upload", {
        method: "POST",
        body,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setUploadError(data?.error ?? "Upload failed.");
        return;
      }
      onCreated(data.transcript as TranscriptDTO);
      handleOpenChange(false);
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitPaste(event: React.FormEvent) {
    event.preventDefault();
    if (!pasteContent.trim()) {
      setPasteError("Please paste some transcript text.");
      return;
    }
    setPasteError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/transcripts/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: pasteTitle, content: pasteContent }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPasteError(data?.error ?? "Could not save transcript.");
        return;
      }
      onCreated(data.transcript as TranscriptDTO);
      handleOpenChange(false);
    } catch {
      setPasteError("Could not save transcript. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import a transcript</DialogTitle>
          <DialogDescription>
            Upload audio to transcribe, or paste an existing transcript.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue="upload"
          className="mt-1 flex w-full min-w-0 flex-col"
        >
          <TabsList className="w-full">
            <TabsTrigger value="upload">Upload audio</TabsTrigger>
            <TabsTrigger value="paste">Paste transcript</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="min-w-0">
            <form onSubmit={submitUpload} className="flex flex-col gap-4 pt-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="audio-file">Audio file (mp3, m4a, wav)</Label>
                <Input
                  id="audio-file"
                  type="file"
                  accept=".mp3,.m4a,.wav,audio/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="upload-title">Title (optional)</Label>
                <Input
                  id="upload-title"
                  placeholder="e.g. Team standup"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                />
              </div>
              {uploadError && (
                <p role="alert" className="text-destructive text-sm">
                  {uploadError}
                </p>
              )}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {submitting ? "Uploading…" : "Upload & transcribe"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="paste" className="min-w-0">
            <form onSubmit={submitPaste} className="flex flex-col gap-4 pt-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="paste-title">Title (optional)</Label>
                <Input
                  id="paste-title"
                  placeholder="e.g. Interview notes"
                  value={pasteTitle}
                  onChange={(e) => setPasteTitle(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="paste-content">Transcript text</Label>
                <Textarea
                  id="paste-content"
                  placeholder="Paste your transcript here…"
                  rows={8}
                  className="max-h-64 w-full"
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                />
              </div>
              {pasteError && (
                <p role="alert" className="text-destructive text-sm">
                  {pasteError}
                </p>
              )}
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {submitting ? "Saving…" : "Save transcript"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
