"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";

import { toast } from "sonner";

import { ChatPanel } from "@/components/chat-panel";
import { ConsentNotice } from "@/components/consent-notice";
import { ImportDialog } from "@/components/import-dialog";
import { RecordDialog } from "@/components/record-dialog";
import { TranscriptSidebar } from "@/components/transcript-sidebar";
import { TranscriptView } from "@/components/transcript-view";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { FolderDTO, TranscriptDTO } from "@/lib/transcript-types";

const POLL_INTERVAL_MS = 3000;

export function Workspace({ username }: { username: string }) {
  const [transcripts, setTranscripts] = useState<TranscriptDTO[]>([]);
  const [folders, setFolders] = useState<FolderDTO[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [recordOpen, setRecordOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch("/api/transcripts", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { transcripts: TranscriptDTO[] };
      setTranscripts(data.transcripts);
    } catch {
      // ignore transient fetch errors; the next poll/refresh will retry
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch("/api/folders", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { folders: FolderDTO[] };
      setFolders(data.folders);
    } catch {
      // ignore — folders are organizational only
    }
  }, []);

  // Initial load. These only update state after an awaited network call, so
  // they're safe data-fetches-on-mount despite the lint rule.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchList();
    fetchFolders();
  }, [fetchList, fetchFolders]);

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

  function handleUpdated(updated: TranscriptDTO) {
    setTranscripts((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
  }

  function handleDeleted(id: string) {
    setTranscripts((prev) => prev.filter((t) => t.id !== id));
    setSelectedId((curr) => (curr === id ? null : curr));
  }

  async function handleDeleteAll() {
    try {
      const res = await fetch("/api/transcripts", { method: "DELETE" });
      if (!res.ok) {
        toast.error("Could not delete your data.");
        return;
      }
      setSelectedId(null);
      await fetchList(); // re-seeds the sample transcript
      toast.success("All your data was deleted.");
    } catch {
      toast.error("Could not delete your data.");
    }
  }

  async function handleCreateFolder(name: string) {
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        toast.error("Could not create folder.");
        return;
      }
      await fetchFolders();
      toast.success("Folder created.");
    } catch {
      toast.error("Could not create folder.");
    }
  }

  async function handleRenameFolder(id: string, name: string) {
    try {
      const res = await fetch(`/api/folders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        toast.error("Could not rename folder.");
        return;
      }
      await fetchFolders();
      toast.success("Folder renamed.");
    } catch {
      toast.error("Could not rename folder.");
    }
  }

  async function handleDeleteFolder(id: string) {
    try {
      const res = await fetch(`/api/folders/${id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Could not delete folder.");
        return;
      }
      // Its transcripts become unfiled (FK ON DELETE SET NULL) — refresh both.
      await Promise.all([fetchFolders(), fetchList()]);
      toast.success("Folder deleted. Its transcripts moved to Unfiled.");
    } catch {
      toast.error("Could not delete folder.");
    }
  }

  async function handleRenameTranscript(id: string, title: string) {
    try {
      const res = await fetch(`/api/transcripts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Could not rename.");
        return;
      }
      handleUpdated(data.transcript as TranscriptDTO);
      toast.success("Renamed.");
    } catch {
      toast.error("Could not rename.");
    }
  }

  async function handleDeleteTranscript(id: string) {
    try {
      const res = await fetch(`/api/transcripts/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Could not delete.");
        return;
      }
      handleDeleted(id);
      toast.success("Transcript deleted.");
    } catch {
      toast.error("Could not delete.");
    }
  }

  async function handleMoveTranscript(
    transcriptId: string,
    folderId: string | null
  ) {
    try {
      const res = await fetch(`/api/transcripts/${transcriptId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Could not move transcript.");
        return;
      }
      handleUpdated(data.transcript as TranscriptDTO);
      toast.success(folderId ? "Moved to folder." : "Removed from folder.");
    } catch {
      toast.error("Could not move transcript.");
    }
  }

  const selected = transcripts.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="flex h-dvh w-full">
      <TranscriptSidebar
        username={username}
        transcripts={transcripts}
        folders={folders}
        selectedId={selectedId}
        loading={loading}
        onSelect={setSelectedId}
        onImport={() => setImportOpen(true)}
        onRecord={() => setRecordOpen(true)}
        onDeleteAll={handleDeleteAll}
        onCreateFolder={handleCreateFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
        onMoveTranscript={handleMoveTranscript}
        onRenameTranscript={handleRenameTranscript}
        onDeleteTranscript={handleDeleteTranscript}
      />

      <main className="flex flex-1 overflow-hidden">
        {selected ? (
          <>
            <div className="flex-1 overflow-y-auto">
              <TranscriptView
                transcript={selected}
                onUpdated={handleUpdated}
                onDeleted={handleDeleted}
              />
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

      {recordOpen && (
        <RecordDialog
          open={recordOpen}
          onOpenChange={setRecordOpen}
          onCreated={handleCreated}
        />
      )}

      <ConsentNotice />
    </div>
  );
}
