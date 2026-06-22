import "server-only";

/**
 * Global guardrails. The app has a single shared login, so these are global
 * daily caps (not per-user) to protect API spend on a public demo. All are
 * overridable via env with conservative defaults.
 */

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// Max audio per day, in seconds (across all completed transcriptions).
export const MAX_UPLOAD_SECONDS_PER_DAY = intEnv(
  "MAX_UPLOAD_SECONDS_PER_DAY",
  1800 // 30 minutes
);

// Max number of upload/recording jobs started per day.
export const MAX_UPLOADS_PER_DAY = intEnv("MAX_UPLOADS_PER_DAY", 20);

// Max chat messages per day.
export const MAX_CHATS_PER_DAY = intEnv("MAX_CHATS_PER_DAY", 100);

// Max upload file size, in bytes.
export const MAX_UPLOAD_BYTES = intEnv("MAX_UPLOAD_MB", 25) * 1024 * 1024; // 25 MB
