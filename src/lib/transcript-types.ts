/**
 * Client-safe transcript shape (the JSON returned by the API). Dates are
 * serialized to strings over the wire. Kept free of server-only imports so it
 * can be shared by client components.
 */

export type TranscriptStatus = "processing" | "ready" | "error";
export type TranscriptSource = "upload" | "recording" | "pasted";

export interface TranscriptDTO {
  id: string;
  owner: string;
  title: string | null;
  source: TranscriptSource;
  status: TranscriptStatus;
  content: string | null;
  durationSeconds: number | null;
  assemblyaiId: string | null;
  isSample: boolean;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FolderDTO {
  id: string;
  owner: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export type MessageRole = "user" | "assistant";

export interface MessageDTO {
  id: string;
  transcriptId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}
