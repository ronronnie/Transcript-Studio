"use client";

import { useState } from "react";
import {
  CircleAlert,
  FileText,
  Loader2,
  Mic,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import type { TranscriptDTO } from "@/lib/transcript-types";

interface TranscriptSidebarProps {
  username: string;
  transcripts: TranscriptDTO[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onImport: () => void;
  onRecord: () => void;
  onDeleteAll: () => void;
}

function StatusHint({ status }: { status: TranscriptDTO["status"] }) {
  if (status === "processing") {
    return (
      <span className="text-muted-foreground flex items-center gap-1 text-xs">
        <Loader2 className="size-3 animate-spin" />
        Transcribing…
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="text-destructive flex items-center gap-1 text-xs">
        <CircleAlert className="size-3" />
        Failed
      </span>
    );
  }
  return null;
}

export function TranscriptSidebar({
  username,
  transcripts,
  selectedId,
  loading,
  onSelect,
  onImport,
  onRecord,
  onDeleteAll,
}: TranscriptSidebarProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <aside className="bg-sidebar text-sidebar-foreground flex h-full w-72 shrink-0 flex-col border-r">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
            <FileText className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-tight">
              Transcript Studio
            </p>
            <p className="text-muted-foreground truncate text-xs">{username}</p>
          </div>
        </div>
        <div className="flex items-center">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </div>

      <div className="flex gap-2 px-3 pt-3">
        <Button size="sm" className="flex-1 justify-start" onClick={onImport}>
          <Plus className="size-4" />
          Import
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 justify-start"
          onClick={onRecord}
        >
          <Mic className="size-4" />
          Record
        </Button>
      </div>

      <div className="mt-2 px-4 py-2">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Transcripts
        </h2>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2 px-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-1.5 px-2 py-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          ))}
        </div>
      ) : transcripts.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="text-muted-foreground text-sm">No transcripts yet</p>
          <p className="text-muted-foreground/70 mt-1 text-xs">
            Import audio or paste text to get started.
          </p>
        </div>
      ) : (
        <nav className="flex-1 overflow-y-auto px-2 pb-3">
          <ul className="flex flex-col gap-0.5">
            {transcripts.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onSelect(t.id)}
                  className={cn(
                    "hover:bg-accent flex w-full flex-col gap-0.5 rounded-md px-2 py-2 text-left transition-colors",
                    selectedId === t.id && "bg-accent"
                  )}
                >
                  <span className="truncate text-sm font-medium">
                    {t.title ?? "Untitled transcript"}
                  </span>
                  <StatusHint status={t.status} />
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="mt-auto border-t p-3">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive w-full justify-start"
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="size-4" />
          Delete all my data
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all your data?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes every transcript and all chat history.
              This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                setConfirmOpen(false);
                onDeleteAll();
              }}
            >
              Delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
