import { sql } from "drizzle-orm";
import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Database schema for Transcript Studio.
 *
 * Single-user by design: every row carries an `owner` column that defaults to
 * 'default-user'. There is no auth provider — login is a single fixed user (see
 * the app's auth layer). The `owner` column exists so the schema can be extended
 * to multiple users later without a migration that touches existing rows.
 *
 * NOTE: No Postgres row-level security (RLS) is configured, and none is needed.
 * The browser never connects to Postgres directly — all access goes through our
 * server-side data layer / API routes, which scope queries to the current owner.
 */

export const transcripts = pgTable("transcripts", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  owner: text("owner").notNull().default("default-user"),
  title: text("title"),
  // 'upload' | 'recording' | 'pasted'
  source: text("source").notNull(),
  // 'processing' | 'ready' | 'error'
  status: text("status").notNull().default("processing"),
  content: text("content"),
  durationSeconds: integer("duration_seconds"),
  assemblyaiId: text("assemblyai_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  transcriptId: uuid("transcript_id")
    .notNull()
    .references(() => transcripts.id, { onDelete: "cascade" }),
  // 'user' | 'assistant'
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// String-literal unions kept alongside the schema so the data layer and API
// routes share one source of truth for these column values.
export type TranscriptSource = "upload" | "recording" | "pasted";
export type TranscriptStatus = "processing" | "ready" | "error";
export type MessageRole = "user" | "assistant";

export type Transcript = typeof transcripts.$inferSelect;
export type NewTranscript = typeof transcripts.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
