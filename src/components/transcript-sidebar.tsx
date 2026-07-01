"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CircleAlert,
  FileText,
  Folder,
  FolderPlus,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
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
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import type { FolderDTO, TranscriptDTO } from "@/lib/transcript-types";

const COLLAPSE_KEY = "ts_folder_collapsed";
const UNFILED = "unfiled";

interface TranscriptSidebarProps {
  username: string;
  transcripts: TranscriptDTO[];
  folders: FolderDTO[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDeleteAll: () => void;
  onCreateFolder: (name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onMoveTranscript: (transcriptId: string, folderId: string | null) => void;
  onRenameTranscript: (id: string, title: string) => void;
  onDeleteTranscript: (id: string) => void;
}

function StatusHint({ status }: { status: TranscriptDTO["status"] }) {
  if (status === "processing") {
    return (
      <span className="text-muted-foreground flex items-center gap-1 text-xs">
        <Spinner className="size-3" />
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

function TranscriptRow({
  transcript,
  selected,
  folders,
  onSelect,
  onMove,
  onRename,
  onRequestDelete,
}: {
  transcript: TranscriptDTO;
  selected: boolean;
  folders: FolderDTO[];
  onSelect: (id: string) => void;
  onMove: (transcriptId: string, folderId: string | null) => void;
  onRename: (id: string, title: string) => void;
  onRequestDelete: (transcript: TranscriptDTO) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(transcript.title ?? "");
  const otherFolders = folders.filter((f) => f.id !== transcript.folderId);

  function commitRename() {
    const next = draft.trim();
    if (next && next !== (transcript.title ?? ""))
      onRename(transcript.id, next);
    setRenaming(false);
  }

  if (renaming) {
    return (
      <li className="px-1 py-0.5">
        <Input
          value={draft}
          autoFocus
          className="h-8"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") setRenaming(false);
          }}
          onBlur={commitRename}
        />
      </li>
    );
  }

  return (
    <li
      className={cn(
        "hover:bg-accent flex items-center gap-1 rounded-md",
        selected && "bg-accent"
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(transcript.id)}
        className="flex min-w-0 flex-1 flex-col gap-0.5 px-2 py-2 text-left"
      >
        <span className="truncate text-sm font-medium">
          {transcript.title ?? "Untitled transcript"}
        </span>
        <StatusHint status={transcript.status} />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground mr-1 shrink-0"
              aria-label="Transcript actions"
            />
          }
        >
          <MoreVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!transcript.isSample && (
            <DropdownMenuItem
              onClick={() => {
                setDraft(transcript.title ?? "");
                setRenaming(true);
              }}
            >
              <Pencil className="size-4" />
              Rename
            </DropdownMenuItem>
          )}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Folder className="size-4" />
              Move to folder
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {otherFolders.length === 0 ? (
                <DropdownMenuItem disabled>No other folders</DropdownMenuItem>
              ) : (
                otherFolders.map((f) => (
                  <DropdownMenuItem
                    key={f.id}
                    onClick={() => onMove(transcript.id, f.id)}
                  >
                    {f.name}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {transcript.folderId && (
            <DropdownMenuItem onClick={() => onMove(transcript.id, null)}>
              Remove from folder
            </DropdownMenuItem>
          )}
          {!transcript.isSample && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onRequestDelete(transcript)}
              >
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

export function TranscriptSidebar({
  username,
  transcripts,
  folders,
  selectedId,
  loading,
  onSelect,
  onNew,
  onDeleteAll,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveTranscript,
  onRenameTranscript,
  onDeleteTranscript,
}: TranscriptSidebarProps) {
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [folderToDelete, setFolderToDelete] = useState<FolderDTO | null>(null);
  const [transcriptToDelete, setTranscriptToDelete] =
    useState<TranscriptDTO | null>(null);

  // Persist collapsed/expanded folder state across reloads.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLLAPSE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setCollapsed(JSON.parse(raw));
    } catch {
      // ignore malformed storage
    }
  }, []);

  function toggle(key: string) {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function submitNewFolder() {
    const name = newName.trim();
    if (name) onCreateFolder(name);
    setNewName("");
    setCreating(false);
  }

  function submitRename(id: string) {
    const name = renameDraft.trim();
    if (name) onRenameFolder(id, name);
    setRenamingId(null);
  }

  const unfiled = transcripts.filter((t) => !t.folderId);

  function renderRows(rows: TranscriptDTO[]) {
    return (
      <ul className="flex flex-col gap-0.5">
        {rows.map((t) => (
          <TranscriptRow
            key={t.id}
            transcript={t}
            selected={selectedId === t.id}
            folders={folders}
            onSelect={onSelect}
            onMove={onMoveTranscript}
            onRename={onRenameTranscript}
            onRequestDelete={setTranscriptToDelete}
          />
        ))}
      </ul>
    );
  }

  // A render function (not a component) so it reconciles by position and the
  // inline rename input keeps focus across re-renders.
  function renderGroupHeader({
    label,
    keyName,
    count,
    folder,
  }: {
    label: string;
    keyName: string;
    count: number;
    folder?: FolderDTO;
  }) {
    const isCollapsed = collapsed[keyName];
    if (folder && renamingId === folder.id) {
      return (
        <div className="flex items-center gap-1 px-2 py-1">
          <Input
            value={renameDraft}
            autoFocus
            className="h-7"
            onChange={(e) => setRenameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename(folder.id);
              if (e.key === "Escape") setRenamingId(null);
            }}
            onBlur={() => setRenamingId(null)}
          />
        </div>
      );
    }
    return (
      <div className="group/folder hover:bg-accent/50 flex items-center gap-1 rounded-md">
        <button
          type="button"
          onClick={() => toggle(keyName)}
          className="text-muted-foreground flex min-w-0 flex-1 items-center gap-1 px-2 py-1.5 text-xs font-medium tracking-wide uppercase"
        >
          {isCollapsed ? (
            <ChevronRight className="size-3.5 shrink-0" />
          ) : (
            <ChevronDown className="size-3.5 shrink-0" />
          )}
          {folder ? (
            <Folder className="size-3.5 shrink-0" />
          ) : (
            <FileText className="size-3.5 shrink-0" />
          )}
          <span className="truncate">{label}</span>
          <span className="text-muted-foreground/60">{count}</span>
        </button>
        {folder && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground mr-1 shrink-0"
                  aria-label="Folder actions"
                />
              }
            >
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setRenameDraft(folder.name);
                  setRenamingId(folder.id);
                }}
              >
                <Pencil className="size-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setFolderToDelete(folder)}
              >
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  }

  return (
    <aside className="bg-sidebar text-sidebar-foreground flex h-full w-72 shrink-0 flex-col border-r">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="bg-brand-gradient flex size-8 shrink-0 items-center justify-center rounded-md text-white shadow-sm">
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

      <div className="px-3 pt-3">
        <Button size="sm" className="w-full justify-center" onClick={onNew}>
          <Plus className="size-4" />
          New
        </Button>
      </div>

      <div className="flex items-center justify-between px-4 py-2">
        <h2 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Transcripts
        </h2>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          aria-label="New folder"
          title="New folder"
          onClick={() => setCreating(true)}
        >
          <FolderPlus className="size-4" />
        </Button>
      </div>

      {creating && (
        <div className="px-3 pb-1">
          <Input
            value={newName}
            autoFocus
            placeholder="Folder name"
            className="h-8"
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitNewFolder();
              if (e.key === "Escape") {
                setNewName("");
                setCreating(false);
              }
            }}
            onBlur={submitNewFolder}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {loading ? (
          <div className="flex flex-col gap-2 p-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col gap-1.5 px-2 py-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : transcripts.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
            <p className="text-muted-foreground text-sm">No transcripts yet</p>
            <p className="text-muted-foreground/70 mt-1 text-xs">
              Import audio or paste text to get started.
            </p>
          </div>
        ) : folders.length === 0 ? (
          // No folders → flat list.
          renderRows(unfiled)
        ) : (
          <div className="flex flex-col gap-1">
            {folders.map((folder) => {
              const rows = transcripts.filter((t) => t.folderId === folder.id);
              return (
                <div key={folder.id}>
                  {renderGroupHeader({
                    label: folder.name,
                    keyName: folder.id,
                    count: rows.length,
                    folder,
                  })}
                  {!collapsed[folder.id] &&
                    (rows.length > 0 ? (
                      renderRows(rows)
                    ) : (
                      <p className="text-muted-foreground/60 px-3 py-1.5 text-xs">
                        Empty — move transcripts here.
                      </p>
                    ))}
                </div>
              );
            })}
            <div>
              {renderGroupHeader({
                label: "Unfiled",
                keyName: UNFILED,
                count: unfiled.length,
              })}
              {!collapsed[UNFILED] && renderRows(unfiled)}
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto border-t p-3">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive w-full justify-start"
          onClick={() => setConfirmDeleteAll(true)}
        >
          <Trash2 className="size-4" />
          Delete all my data
        </Button>
      </div>

      <AlertDialog open={confirmDeleteAll} onOpenChange={setConfirmDeleteAll}>
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
                setConfirmDeleteAll(false);
                onDeleteAll();
              }}
            >
              Delete everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={folderToDelete !== null}
        onOpenChange={(open) => !open && setFolderToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete folder “{folderToDelete?.name}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The folder will be removed. Its transcripts are kept and moved to
              Unfiled — nothing is deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (folderToDelete) onDeleteFolder(folderToDelete.id);
                setFolderToDelete(null);
              }}
            >
              Delete folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={transcriptToDelete !== null}
        onOpenChange={(open) => !open && setTranscriptToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this transcript?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes “
              {transcriptToDelete?.title ?? "Untitled transcript"}” and its chat
              history. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (transcriptToDelete)
                  onDeleteTranscript(transcriptToDelete.id);
                setTranscriptToDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
