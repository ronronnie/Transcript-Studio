import "server-only";

import { eq, sql } from "drizzle-orm";

import {
  MAX_CHATS_PER_DAY,
  MAX_UPLOAD_SECONDS_PER_DAY,
  MAX_UPLOADS_PER_DAY,
} from "@/lib/config";
import { db } from "@/lib/db/client";
import { dailyUsage } from "@/lib/db/schema";

/**
 * DB-backed global daily usage limiter.
 *
 * One row per UTC day tracks uploads started, audio seconds transcribed, and
 * chat messages. Caps are global (single shared login) to protect API spend.
 * Counters persist in Postgres so limits survive restarts and serverless cold
 * starts.
 */

function today(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

async function getOrCreate(day: string) {
  await db.insert(dailyUsage).values({ day }).onConflictDoNothing();
  const [row] = await db
    .select()
    .from(dailyUsage)
    .where(eq(dailyUsage.day, day))
    .limit(1);
  return row;
}

export interface LimitResult {
  allowed: boolean;
  error?: string;
}

/** Check + reserve one upload slot for today. */
export async function consumeUpload(): Promise<LimitResult> {
  const day = today();
  const row = await getOrCreate(day);

  if (row.uploads >= MAX_UPLOADS_PER_DAY) {
    return {
      allowed: false,
      error: `Daily upload limit reached (${MAX_UPLOADS_PER_DAY}/day). Please try again tomorrow.`,
    };
  }
  if (row.uploadSeconds >= MAX_UPLOAD_SECONDS_PER_DAY) {
    return {
      allowed: false,
      error: `Daily transcription limit reached (${Math.round(
        MAX_UPLOAD_SECONDS_PER_DAY / 60
      )} min/day). Please try again tomorrow.`,
    };
  }

  await db
    .update(dailyUsage)
    .set({ uploads: sql`${dailyUsage.uploads} + 1` })
    .where(eq(dailyUsage.day, day));
  return { allowed: true };
}

/** Record transcribed audio seconds (called when a job completes). */
export async function recordUploadSeconds(seconds: number): Promise<void> {
  if (!Number.isFinite(seconds) || seconds <= 0) return;
  const day = today();
  await getOrCreate(day);
  await db
    .update(dailyUsage)
    .set({
      uploadSeconds: sql`${dailyUsage.uploadSeconds} + ${Math.round(seconds)}`,
    })
    .where(eq(dailyUsage.day, day));
}

/** Check + reserve one chat message for today. */
export async function consumeChat(): Promise<LimitResult> {
  const day = today();
  const row = await getOrCreate(day);

  if (row.chats >= MAX_CHATS_PER_DAY) {
    return {
      allowed: false,
      error: `Daily chat limit reached (${MAX_CHATS_PER_DAY} messages/day). Please try again tomorrow.`,
    };
  }

  await db
    .update(dailyUsage)
    .set({ chats: sql`${dailyUsage.chats} + 1` })
    .where(eq(dailyUsage.day, day));
  return { allowed: true };
}
