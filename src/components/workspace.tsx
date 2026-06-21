"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";

import { ChatPanel } from "@/components/chat-panel";
import { ImportDialog } from "@/components/import-dialog";
import { TranscriptSidebar } from "@/components/transcript-sidebar";
import { TranscriptView } from "@/components/transcript-view";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TranscriptDTO } from "@/lib/transcript-types";

const POLL_INTERVAL_MS = 3000;

export function Workspace({ username }: { username: string }) {
  const [transcripts, setTranscripts] = useState<TranscriptDTO[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch("/api/transcripts", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { transcripts: TranscriptDTO[] };
      setTranscripts(data.transcripts);
    } catch {
      // ignore transient fetch errors; the next poll/refresh will retry
    }
  }, []);

  // Initial load. fetchList only updates state after an awaited network call,
  // so this is a safe data-fetch-on-mount despite the lint rule.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchList();
  }, [fetchList]);

  // Poll while anything is still processing; stop when nothing is.
  const hasProcessing = transcripts.some((t) => t.status === "processing");
  useEffect(() => {
    if (!hasProcessing) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }
    if (pollRef.current) return;
    pollRef.current = setInterval(fetchList, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [hasProcessing, fetchList]);

  function handleCreated(transcript: TranscriptDTO) {
    setTranscripts((prev) => [transcript, ...prev]);
    setSelectedId(transcript.id);
  }

  const selected = transcripts.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="flex h-dvh w-full">
      <TranscriptSidebar
        username={username}
        transcripts={transcripts}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onImport={() => setImportOpen(true)}
      />

      <main className="flex flex-1 overflow-hidden">
        {selected ? (
          <>
            <div className="flex-1 overflow-y-auto">
              <TranscriptView transcript={selected} />
            </div>
            <ChatPanel key={selected.id} transcript={selected} />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-6">
            <Card className="w-full max-w-md text-center">
              <CardHeader className="items-center">
                <div className="bg-primary text-primary-foreground mx-auto flex size-12 items-center justify-center rounded-xl">
                  <Mic className="size-6" />
                </div>
                <CardTitle className="mt-2 text-2xl">
                  Transcript Studio
                </CardTitle>
                <CardDescription className="text-base">
                  Record or import a transcript, then ask an LLM about it.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  {transcripts.length === 0
                    ? "Import audio or paste text to get started."
                    : "Select a transcript from the sidebar to read it."}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onCreated={handleCreated}
      />
    </div>
  );
}
