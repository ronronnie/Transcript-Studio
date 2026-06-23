import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "./client";
import {
  type Folder,
  folders,
  type Message,
  type MessageRole,
  messages,
  type Transcript,
  type TranscriptSource,
  type TranscriptStatus,
  transcripts,
} from "./schema";

/**
 * Typed, server-side data-access layer for Transcript Studio.
 *
 * Every function here runs on the server (the module imports "server-only").
 * Queries are scoped to a single owner; until real auth lands, the default
 * owner is 'default-user'. See ./schema.ts for why no RLS is required.
 */

const DEFAULT_OWNER = "default-user";

export type { Transcript, Message, Folder };

// --- Folders ---------------------------------------------------------------

/** List an owner's folders, alphabetically. */
export async function listFolders(
  owner: string = DEFAULT_OWNER
): Promise<Folder[]> {
  return db
    .select()
    .from(folders)
    .where(eq(folders.owner, owner))
    .orderBy(asc(folders.name));
}

/** Create a folder and return it. */
export async function createFolder(
  name: string,
  owner: string = DEFAULT_OWNER
): Promise<Folder> {
  const [row] = await db.insert(folders).values({ owner, name }).returning();
  return row;
}

/** Rename a folder (scoped to owner). Returns the updated row or null. */
export async function renameFolder(
  id: string,
  name: string,
  owner: string = DEFAULT_OWNER
): Promise<Folder | null> {
  const [row] = await db
    .update(folders)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(folders.id, id), eq(folders.owner, owner)))
    .returning();
  return row ?? null;
}

/**
 * Delete a folder (scoped to owner). The transcripts.folder_id FK is
 * ON DELETE SET NULL, so the folder's transcripts become unfiled rather than
 * being deleted. Returns true if a folder was removed.
 */
export async function deleteFolder(
  id: string,
  owner: string = DEFAULT_OWNER
): Promise<boolean> {
  const deleted = await db
    .delete(folders)
    .where(and(eq(folders.id, id), eq(folders.owner, owner)))
    .returning({ id: folders.id });
  return deleted.length > 0;
}

/** Move a transcript into a folder (or out of any folder when null). */
export async function moveTranscript(
  transcriptId: string,
  folderId: string | null,
  owner: string = DEFAULT_OWNER
): Promise<Transcript | null> {
  const [row] = await db
    .update(transcripts)
    .set({ folderId, updatedAt: new Date() })
    .where(and(eq(transcripts.id, transcriptId), eq(transcripts.owner, owner)))
    .returning();
  return row ?? null;
}

export interface CreateTranscriptInput {
  source: TranscriptSource;
  title?: string | null;
  status?: TranscriptStatus;
  content?: string | null;
  durationSeconds?: number | null;
  assemblyaiId?: string | null;
  isSample?: boolean;
  owner?: string;
}

// Fields that callers may patch on a transcript. `owner` and `id` are not
// updatable here, and `updatedAt` is always bumped by updateTranscript.
export interface UpdateTranscriptInput {
  title?: string | null;
  status?: TranscriptStatus;
  source?: TranscriptSource;
  content?: string | null;
  durationSeconds?: number | null;
  assemblyaiId?: string | null;
  folderId?: string | null;
}

/** List transcripts for an owner, newest first. */
export async function listTranscripts(
  owner: string = DEFAULT_OWNER
): Promise<Transcript[]> {
  return db
    .select()
    .from(transcripts)
    .where(eq(transcripts.owner, owner))
    .orderBy(desc(transcripts.createdAt));
}

/** Fetch a single transcript by id (scoped to owner). */
export async function getTranscript(
  id: string,
  owner: string = DEFAULT_OWNER
): Promise<Transcript | null> {
  const [row] = await db
    .select()
    .from(transcripts)
    .where(and(eq(transcripts.id, id), eq(transcripts.owner, owner)))
    .limit(1);

  return row ?? null;
}

/** Create a transcript and return the inserted row. */
export async function createTranscript(
  input: CreateTranscriptInput
): Promise<Transcript> {
  const [row] = await db
    .insert(transcripts)
    .values({
      owner: input.owner ?? DEFAULT_OWNER,
      source: input.source,
      title: input.title ?? null,
      status: input.status ?? "processing",
      content: input.content ?? null,
      durationSeconds: input.durationSeconds ?? null,
      assemblyaiId: input.assemblyaiId ?? null,
      isSample: input.isSample ?? false,
    })
    .returning();

  return row;
}

/**
 * Patch a transcript (scoped to owner) and bump updated_at. Returns the updated
 * row, or null if no matching transcript exists.
 */
export async function updateTranscript(
  id: string,
  input: UpdateTranscriptInput,
  owner: string = DEFAULT_OWNER
): Promise<Transcript | null> {
  const [row] = await db
    .update(transcripts)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(transcripts.id, id), eq(transcripts.owner, owner)))
    .returning();

  return row ?? null;
}

/**
 * Delete a transcript (scoped to owner). The messages.transcript_id FK is
 * ON DELETE CASCADE, so this removes the transcript's messages too. Returns
 * true if a row was deleted.
 */
export async function deleteTranscript(
  id: string,
  owner: string = DEFAULT_OWNER
): Promise<boolean> {
  const deleted = await db
    .delete(transcripts)
    .where(and(eq(transcripts.id, id), eq(transcripts.owner, owner)))
    .returning({ id: transcripts.id });

  return deleted.length > 0;
}

/** Delete every transcript for an owner (cascades to messages). */
export async function deleteAllTranscripts(
  owner: string = DEFAULT_OWNER
): Promise<number> {
  const deleted = await db
    .delete(transcripts)
    .where(eq(transcripts.owner, owner))
    .returning({ id: transcripts.id });

  return deleted.length;
}

/** Count an owner's transcripts (used to decide whether to seed the sample). */
export async function countTranscripts(
  owner: string = DEFAULT_OWNER
): Promise<number> {
  const rows = await db
    .select({ id: transcripts.id })
    .from(transcripts)
    .where(eq(transcripts.owner, owner));
  return rows.length;
}

/** List messages for a transcript, oldest first (chat order). */
export async function listMessages(transcriptId: string): Promise<Message[]> {
  return db
    .select()
    .from(messages)
    .where(eq(messages.transcriptId, transcriptId))
    .orderBy(asc(messages.createdAt));
}

/** Append a chat message to a transcript and return the inserted row. */
export async function addMessage(
  transcriptId: string,
  role: MessageRole,
  content: string
): Promise<Message> {
  const [row] = await db
    .insert(messages)
    .values({ transcriptId, role, content })
    .returning();

  return row;
}
